const DEFAULT_CLIENT_URL = 'http://scholarship.vigancity.gov.ph';

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
};

const getFromHeaders = (req) => {
  if (!req) return '';

  const origin = normalizeBaseUrl(req.headers?.origin);
  if (origin) return origin;

  const forwardedHost = String(req.headers?.['x-forwarded-host'] || '').split(',')[0].trim();
  const directHost = String(req.headers?.host || '').split(',')[0].trim();
  const host = forwardedHost || directHost;
  if (!host) return '';

  const forwardedProto = String(req.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';

  return normalizeBaseUrl(`${protocol}://${host}`);
};

const getClientBaseUrl = (req) => {
  return (
    getFromHeaders(req) ||
    normalizeBaseUrl(process.env.CLIENT_URL) ||
    DEFAULT_CLIENT_URL
  );
};

module.exports = { getClientBaseUrl };
