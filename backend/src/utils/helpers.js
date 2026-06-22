export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

export function paginate(page = 1, limit = 12) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

export function apiError(res, status, message) {
  return res.status(status).json({ error: message });
}

export function apiSuccess(res, data, status = 200) {
  return res.status(status).json(data);
}
