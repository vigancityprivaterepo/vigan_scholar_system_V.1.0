const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();
const SETTINGS_ID = 'default';

const normalizeOptionalText = (value) => {
  if (value === undefined) return undefined;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const validateFacebookUrl = (value) => {
  if (!value) return null;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new AppError('Facebook page URL must be a valid URL.', 400);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError('Facebook page URL must start with http:// or https://.', 400);
  }

  return parsed.toString();
};

const serializeSettings = (settings) => ({
  facebookPageName: settings?.facebook_page_name || '',
  facebookPageUrl: settings?.facebook_page_url || '',
  facebookPageDescription: settings?.facebook_page_description || '',
});

const ensureSiteSettingsTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "site_settings" (
      "id" TEXT NOT NULL DEFAULT 'default',
      "facebook_page_name" TEXT,
      "facebook_page_url" TEXT,
      "facebook_page_description" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
    )
  `);
};

const getSettingsRow = async () => {
  await ensureSiteSettingsTable();
  const rows = await prisma.$queryRaw`
    SELECT
      "facebook_page_name",
      "facebook_page_url",
      "facebook_page_description"
    FROM "site_settings"
    WHERE "id" = ${SETTINGS_ID}
    LIMIT 1
  `;
  return rows[0] || null;
};

const getPublicSiteSettings = async (req, res, next) => {
  try {
    const settings = await getSettingsRow();
    res.json({ success: true, settings: serializeSettings(settings) });
  } catch (err) {
    next(err);
  }
};

const getAdminSiteSettings = async (req, res, next) => {
  try {
    const settings = await getSettingsRow();
    res.json({ success: true, settings: serializeSettings(settings) });
  } catch (err) {
    next(err);
  }
};

const updateAdminSiteSettings = async (req, res, next) => {
  try {
    const facebookPageName = normalizeOptionalText(req.body.facebookPageName);
    const facebookPageDescription = normalizeOptionalText(req.body.facebookPageDescription);
    const rawUrl = normalizeOptionalText(req.body.facebookPageUrl);
    const facebookPageUrl = validateFacebookUrl(rawUrl);

    if (facebookPageName && !facebookPageUrl) {
      throw new AppError('Facebook page URL is required when a page name is provided.', 400);
    }

    await ensureSiteSettingsTable();

    const rows = await prisma.$queryRaw`
      INSERT INTO "site_settings" (
        "id",
        "facebook_page_name",
        "facebook_page_url",
        "facebook_page_description",
        "updated_at"
      )
      VALUES (
        ${SETTINGS_ID},
        ${facebookPageName},
        ${facebookPageUrl},
        ${facebookPageDescription},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("id") DO UPDATE SET
        "facebook_page_name" = EXCLUDED."facebook_page_name",
        "facebook_page_url" = EXCLUDED."facebook_page_url",
        "facebook_page_description" = EXCLUDED."facebook_page_description",
        "updated_at" = CURRENT_TIMESTAMP
      RETURNING
        "facebook_page_name",
        "facebook_page_url",
        "facebook_page_description"
    `;

    res.json({
      success: true,
      message: 'Site settings saved.',
      settings: serializeSettings(rows[0] || null),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicSiteSettings,
  getAdminSiteSettings,
  updateAdminSiteSettings,
};
