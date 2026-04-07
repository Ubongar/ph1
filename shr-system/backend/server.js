import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 8787);
const DB_PATH = path.join(__dirname, 'data', 'sync-db.json');
const VALID_ROLES = new Set(['student', 'medical_staff', 'technician', 'pharmacy', 'specialist', 'admin']);

function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      entities: {},
      conflicts: [],
      updatedAt: new Date().toISOString(),
    };
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
    'Access-Control-Allow-Headers': 'Content-Type, x-shr-user-id, x-shr-user-role',
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

function requireAuthenticated(req, res) {
  const identity = getRequestIdentity(req);
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

  sendJson(res, 404, { error: 'Route not found.' });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SHR Sync API listening on http://localhost:${PORT}`);
});
