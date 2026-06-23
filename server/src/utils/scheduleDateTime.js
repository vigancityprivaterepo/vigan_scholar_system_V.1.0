const MANILA_TIME_ZONE = 'Asia/Manila';
const MANILA_OFFSET_HOURS = 8;

const formatManilaDateTime = (value) => new Intl.DateTimeFormat('en-PH', {
  timeZone: MANILA_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
}).format(new Date(value));

const formatManilaDate = (value) => new Intl.DateTimeFormat('en-PH', {
  timeZone: MANILA_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}).format(new Date(value));

const parseManilaScheduleInput = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(raw)) return new Date(raw);

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return new Date(raw);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || '0');

  return new Date(Date.UTC(year, month - 1, day, hour - MANILA_OFFSET_HOURS, minute, second));
};

module.exports = {
  formatManilaDate,
  formatManilaDateTime,
  parseManilaScheduleInput,
};
