const getGwaThreshold = async (prisma) => {
  let rows = [];
  try {
    rows = await prisma.$queryRaw`SELECT "gwa_threshold" FROM "site_settings" WHERE "id" = 'default' LIMIT 1`;
  } catch {
    rows = [];
  }
  return rows[0] ? parseFloat(rows[0].gwa_threshold) : 83;
};

module.exports = { getGwaThreshold };
