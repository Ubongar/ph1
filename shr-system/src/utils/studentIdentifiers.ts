export function getHospitalNumber(matricNumber: string | undefined, studentId: string): string {
  if (!matricNumber) return '—';

  const tokens = matricNumber.split(/[/-]/).map((token) => token.trim());
  const yearToken = tokens.find((token) => /^\d{2}$/.test(token) || /^\d{4}$/.test(token));

  if (!yearToken) return '—';

  const entryYear = yearToken.length === 4
    ? Number.parseInt(yearToken, 10)
    : 2000 + Number.parseInt(yearToken, 10);

  if (!Number.isFinite(entryYear)) return '—';

  const prefix = String((entryYear + 1) % 100).padStart(2, '0');
  const suffixSeed = studentId.replace(/\D/g, '');
  const suffix = (suffixSeed || '0').slice(-4).padStart(4, '0');

  return `${prefix}/${suffix}`;
}
