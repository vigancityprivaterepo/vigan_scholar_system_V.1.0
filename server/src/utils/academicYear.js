const toAcademicYear = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}-${year + 1}`;
};

const parseAcademicYearRange = (academicYear) => {
  const normalized = String(academicYear || '').trim();
  if (!normalized) return null;
  const match = normalized.match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;

  const startYear = parseInt(match[1], 10);
  const endYear = parseInt(match[2], 10);
  if (endYear !== startYear + 1) return null;

  const from = new Date(Date.UTC(startYear, 5, 1, 0, 0, 0, 0)); // Jun 1
  const to = new Date(Date.UTC(endYear, 4, 31, 23, 59, 59, 999)); // May 31
  return { from, to };
};

module.exports = { toAcademicYear, parseAcademicYearRange };
