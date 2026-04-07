import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 8787);
const DB_PATH = path.join(__dirname, 'data', 'sync-db.json');
const VALID_ROLES = new Set(['student', 'medical_staff', 'technician', 'pharmacy', 'specialist', 'admin']);
const TOKEN_SECRET = process.env.SHR_SYNC_TOKEN_SECRET || 'shr-sync-dev-secret-change-me';
const TOKEN_TTL_SECONDS = Number(process.env.SHR_SYNC_TOKEN_TTL_SECONDS || 3600);

function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      entities: {},
      conflicts: [],
      adminAuditLogs: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

function toBase64Url(value) {
  const encoded = Buffer.isBuffer(value) ? value.toString('base64') : Buffer.from(value, 'utf8').toString('base64');
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  return Buffer.from(padded, 'base64');
}

function signTokenPayload(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', TOKEN_SECRET).update(data).digest();
  return `${data}.${toBase64Url(signature)}`;
}

function verifyToken(token) {
  try {
    const [headerPart, payloadPart, signaturePart] = token.split('.');
    if (!headerPart || !payloadPart || !signaturePart) return { ok: false, reason: 'Malformed token.' };

    const data = `${headerPart}.${payloadPart}`;
    const expectedSig = createHmac('sha256', TOKEN_SECRET).update(data).digest();
    const providedSig = fromBase64Url(signaturePart);
    if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
      return { ok: false, reason: 'Invalid token signature.' };
    }

    const payload = JSON.parse(fromBase64Url(payloadPart).toString('utf8'));
    if (!payload?.sub || !payload?.role || !payload?.exp) {
      return { ok: false, reason: 'Invalid token payload.' };
    }

    if (!VALID_ROLES.has(payload.role)) {
      return { ok: false, reason: 'Invalid role claim.' };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds >= payload.exp) {
      return { ok: false, reason: 'Token expired.' };
    }

    return {
      ok: true,
      userId: payload.sub,
      role: payload.role,
      tokenId: payload.jti,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
    };
  } catch {
    return { ok: false, reason: 'Token parse failure.' };
  }
}

function writeDb(db) {
  db.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-shr-user-id, x-shr-user-role',
  });
  res.end(JSON.stringify(payload));
}

function getRequestIdentity(req) {
  const userId = req.headers['x-shr-user-id'];
  const role = req.headers['x-shr-user-role'];

  if (typeof userId !== 'string' || userId.trim() === '') {
    return { ok: false, reason: 'Missing x-shr-user-id header.' };
  }

  if (typeof role !== 'string' || !VALID_ROLES.has(role)) {
    return { ok: false, reason: 'Missing or invalid x-shr-user-role header.' };
  }

  return { ok: true, userId, role };
}

function getIdentityFromBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return { ok: false, reason: 'Missing bearer token.' };
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return { ok: false, reason: 'Missing bearer token.' };
  }

  return verifyToken(token);
}

function requireAuthenticated(req, res) {
  const identity = getIdentityFromBearerToken(req);
  if (!identity.ok) {
    sendJson(res, 401, { error: identity.reason });
    return null;
  }
  return identity;
}

function requireAdmin(req, res) {
  const identity = requireAuthenticated(req, res);
  if (!identity) return null;
  if (identity.role !== 'admin') {
    sendJson(res, 403, { error: 'Admin role is required for this endpoint.' });
    return null;
  }
  return identity;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function ensureBucket(db, storageKey) {
  if (!db.entities[storageKey]) {
    db.entities[storageKey] = {};
  }
  return db.entities[storageKey];
}

function valuesEqual(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function registerConflict(db, mutation, reason, remoteValue) {
  const existing = db.conflicts.find((c) => c.mutationId === mutation.id && c.status === 'pending');
  if (existing) return existing;

  const created = {
    id: randomUUID(),
    mutationId: mutation.id,
    storageKey: mutation.storageKey,
    entityId: mutation.entityId,
    reason,
    localValue: mutation.payload,
    remoteValue: remoteValue ?? null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.conflicts.push(created);
  return created;
}

function appendAdminAuditLog(db, entry) {
  const list = Array.isArray(db.adminAuditLogs) ? db.adminAuditLogs : [];
  list.push({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  db.adminAuditLogs = list;
}

function handleIssueToken(req, res) {
  const identity = getRequestIdentity(req);
  if (!identity.ok) {
    sendJson(res, 401, { error: identity.reason });
    return;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: identity.userId,
    role: identity.role,
    iat: nowSeconds,
    exp: nowSeconds + TOKEN_TTL_SECONDS,
    jti: randomUUID(),
  };
  const token = signTokenPayload(payload);

  sendJson(res, 200, {
    token,
    tokenType: 'Bearer',
    expiresInSeconds: TOKEN_TTL_SECONDS,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
    user: { id: identity.userId, role: identity.role },
  });
}

function handleBatchSync(req, res) {
  const identity = requireAuthenticated(req, res);
  if (!identity) return;

  parseJsonBody(req)
    .then((body) => {
      const db = readDb();
      const mutations = Array.isArray(body.mutations) ? body.mutations : [];
      const results = [];

      for (const mutation of mutations) {
        try {
          const bucket = ensureBucket(db, mutation.storageKey);
          const remoteExisting = bucket[mutation.entityId];

          if (!valuesEqual(mutation.beforeSnapshot, undefined) && !valuesEqual(mutation.beforeSnapshot, remoteExisting)) {
            const reason = 'Remote value changed while client was offline.';
            const conflict = registerConflict(db, mutation, reason, remoteExisting);
            results.push({
              mutationId: mutation.id,
              status: 'conflict',
              reason,
              remoteValue: remoteExisting ?? null,
              serverConflictId: conflict.id,
            });
            continue;
          }

          if (mutation.action === 'create') {
            if (remoteExisting && !valuesEqual(remoteExisting, mutation.payload)) {
              const reason = 'Entity already exists on server with different value.';
              const conflict = registerConflict(db, mutation, reason, remoteExisting);
              results.push({
                mutationId: mutation.id,
                status: 'conflict',
                reason,
                remoteValue: remoteExisting,
                serverConflictId: conflict.id,
              });
              continue;
            }
            bucket[mutation.entityId] = mutation.payload;
          } else if (mutation.action === 'update') {
            const remoteRecord = remoteExisting && typeof remoteExisting === 'object' ? remoteExisting : {};
            const patch = mutation.payload && typeof mutation.payload === 'object' ? mutation.payload : {};
            bucket[mutation.entityId] = { ...remoteRecord, ...patch };
          } else if (mutation.action === 'delete') {
            delete bucket[mutation.entityId];
          } else {
            results.push({
              mutationId: mutation.id,
              status: 'failed',
              reason: `Unsupported action ${mutation.action}`,
            });
            continue;
          }

          results.push({
            mutationId: mutation.id,
            status: 'synced',
            syncedAt: new Date().toISOString(),
          });
        } catch {
          results.push({
            mutationId: mutation.id,
            status: 'failed',
            reason: 'Server error while processing mutation.',
          });
        }
      }

      writeDb(db);
      sendJson(res, 200, {
        processedAt: new Date().toISOString(),
        processedBy: { userId: identity.userId, role: identity.role },
        results,
      });
    })
    .catch((err) => {
      sendJson(res, 400, { error: err.message || 'Invalid request' });
    });
}

function handleListConflicts(req, res) {
  const identity = requireAdmin(req, res);
  if (!identity) return;

  const db = readDb();
  const pending = db.conflicts.filter((item) => item.status === 'pending');
  sendJson(res, 200, {
    requestedBy: { userId: identity.userId, role: identity.role },
    conflicts: pending,
    count: pending.length,
  });
}

function handleAdminAuditLogs(req, res) {
  const identity = requireAdmin(req, res);
  if (!identity) return;

  const db = readDb();
  const logs = Array.isArray(db.adminAuditLogs) ? db.adminAuditLogs : [];
  sendJson(res, 200, {
    requestedBy: { userId: identity.userId, role: identity.role },
    logs,
    count: logs.length,
  });
}

function handleResolveConflict(req, res) {
  const identity = requireAdmin(req, res);
  if (!identity) return;

  parseJsonBody(req)
    .then((body) => {
      const { conflictId, resolution } = body;
      if (!conflictId || !resolution) {
        sendJson(res, 400, { error: 'conflictId and resolution are required.' });
        return;
      }

      const db = readDb();
      const conflict = db.conflicts.find((item) => item.id === conflictId);
      if (!conflict) {
        sendJson(res, 404, { error: 'Conflict not found.' });
        return;
      }

      if (conflict.status !== 'pending') {
        sendJson(res, 200, { conflict, message: 'Conflict already resolved.' });
        return;
      }

      if (resolution !== 'keep_local' && resolution !== 'keep_remote') {
        sendJson(res, 400, { error: 'resolution must be keep_local or keep_remote.' });
        return;
      }

      const bucket = ensureBucket(db, conflict.storageKey);
      if (resolution === 'keep_local') {
        const payload = conflict.localValue && typeof conflict.localValue === 'object'
          ? conflict.localValue
          : null;
        bucket[conflict.entityId] = payload;
      }

      if (resolution === 'keep_remote') {
        if (conflict.remoteValue === null || conflict.remoteValue === undefined) {
          delete bucket[conflict.entityId];
        } else {
          bucket[conflict.entityId] = conflict.remoteValue;
        }
      }

      conflict.status = 'resolved';
      conflict.resolution = resolution;
      conflict.resolvedAt = new Date().toISOString();
      conflict.resolvedBy = identity.userId;

      appendAdminAuditLog(db, {
        adminUserId: identity.userId,
        adminRole: identity.role,
        action: 'RESOLVE_RECONCILIATION_CONFLICT',
        conflictId: conflict.id,
        mutationId: conflict.mutationId,
        storageKey: conflict.storageKey,
        entityId: conflict.entityId,
        decision: resolution,
        reason: conflict.reason,
      });

      writeDb(db);
      sendJson(res, 200, {
        resolvedBy: { userId: identity.userId, role: identity.role },
        conflict,
      });
    })
    .catch((err) => {
      sendJson(res, 400, { error: err.message || 'Invalid request' });
    });
}

const server = http.createServer((req, res) => {
  const method = req.method || 'GET';
  const url = req.url || '/';

  if (method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (method === 'GET' && url === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'shr-sync-api' });
    return;
  }

  if (method === 'POST' && url === '/api/auth/token') {
    handleIssueToken(req, res);
    return;
  }

  if (method === 'POST' && url === '/api/sync/batch') {
    handleBatchSync(req, res);
    return;
  }

  if (method === 'GET' && url === '/api/admin/reconciliation/conflicts') {
    handleListConflicts(req, res);
    return;
  }

  if (method === 'POST' && url === '/api/admin/reconciliation/resolve') {
    handleResolveConflict(req, res);
    return;
  }

  if (method === 'GET' && url === '/api/admin/audit-logs') {
    handleAdminAuditLogs(req, res);
    return;
  }

  sendJson(res, 404, { error: 'Route not found.' });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SHR Sync API listening on http://localhost:${PORT}`);
});
