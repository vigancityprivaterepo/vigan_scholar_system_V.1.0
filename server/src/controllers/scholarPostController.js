const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ensureScholarPostsTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "scholar_posts" (
      "application_id" TEXT NOT NULL,
      "applicant_name" TEXT NOT NULL,
      "school" TEXT,
      "course" TEXT,
      "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "created_by_id" TEXT,
      CONSTRAINT "scholar_posts_pkey" PRIMARY KEY ("application_id")
    )
  `);
};

const getPublicScholarPosts = async (req, res, next) => {
  try {
    await ensureScholarPostsTable();
    const posts = await prisma.$queryRaw`
      SELECT
        "application_id",
        "applicant_name",
        "school",
        "course",
        "posted_at"
      FROM "scholar_posts"
      ORDER BY "posted_at" DESC, "applicant_name" ASC
    `;

    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
};

const getAdminScholarPosts = async (req, res, next) => {
  try {
    await ensureScholarPostsTable();
    const posts = await prisma.$queryRaw`
      SELECT
        "application_id",
        "applicant_name",
        "school",
        "course",
        "posted_at",
        "created_by_id"
      FROM "scholar_posts"
      ORDER BY "posted_at" DESC, "applicant_name" ASC
    `;

    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
};

const publishAcceptedScholars = async (req, res, next) => {
  try {
    await ensureScholarPostsTable();

    const acceptedApplications = await prisma.application.findMany({
      where: { status: 'ACCEPTED' },
      select: {
        id: true,
        school: true,
        course: true,
        applicant: { select: { fullName: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Batch upsert using a single query with unnest
    const ids = acceptedApplications.map(a => a.id);
    const names = acceptedApplications.map(a => a.applicant.fullName);
    const schools = acceptedApplications.map(a => a.school || null);
    const courses = acceptedApplications.map(a => a.course || null);
    const createdByIds = acceptedApplications.map(() => req.user?.id || null);

    let insertedCount = 0;

    if (acceptedApplications.length > 0) {
      const inserted = await prisma.$queryRaw`
        INSERT INTO "scholar_posts" ("application_id", "applicant_name", "school", "course", "created_by_id")
        SELECT * FROM UNNEST(
          ${ids}::text[],
          ${names}::text[],
          ${schools}::text[],
          ${courses}::text[],
          ${createdByIds}::text[]
        ) AS t("application_id", "applicant_name", "school", "course", "created_by_id")
        ON CONFLICT ("application_id") DO NOTHING
        RETURNING "application_id"
      `;
      insertedCount = inserted.length;
    }

    const totalPosts = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS "count" FROM "scholar_posts"
    `;

    if (insertedCount > 0) {
      await prisma.activityLog.create({
        data: {
          performedById: req.user?.id || null,
          action: 'SCHOLAR_POSTS_PUBLISHED',
          notes: `Published ${insertedCount} accepted scholar${insertedCount === 1 ? '' : 's'} to the landing page.`,
        },
      });
    }

    res.json({
      success: true,
      message: insertedCount > 0
        ? `${insertedCount} accepted scholar${insertedCount === 1 ? '' : 's'} posted to the landing page.`
        : 'No new accepted scholars were available to post.',
      insertedCount,
      totalPosts: totalPosts[0]?.count || 0,
    });
  } catch (err) {
    next(err);
  }
};

const deleteScholarPost = async (req, res, next) => {
  try {
    await ensureScholarPostsTable();

    const applicationId = String(req.params.applicationId || '').trim();
    if (!applicationId) {
      return res.status(400).json({ success: false, message: 'Application ID is required.' });
    }

    const deletedRows = await prisma.$queryRaw`
      DELETE FROM "scholar_posts"
      WHERE "application_id" = ${applicationId}
      RETURNING "application_id"
    `;

    if (!deletedRows.length) {
      return res.status(404).json({ success: false, message: 'Posted scholar entry not found.' });
    }

    await prisma.activityLog.create({
      data: {
        performedById: req.user?.id || null,
        action: 'SCHOLAR_POST_DELETED',
        notes: `Removed scholar post for application ${applicationId} from the landing page.`,
      },
    });

    res.json({ success: true, message: 'Posted scholar removed from the landing page.' });
  } catch (err) {
    next(err);
  }
};

const deleteManyScholarPosts = async (req, res, next) => {
  try {
    await ensureScholarPostsTable();

    const applicationIds = Array.isArray(req.body?.applicationIds)
      ? req.body.applicationIds.map((value) => String(value).trim()).filter(Boolean)
      : [];

    if (!applicationIds.length) {
      return res.status(400).json({ success: false, message: 'At least one posted scholar must be selected.' });
    }

    const deletedRows = await prisma.$queryRaw`
      DELETE FROM "scholar_posts"
      WHERE "application_id" = ANY (${applicationIds})
      RETURNING "application_id"
    `;

    if (deletedRows.length > 0) {
      await prisma.activityLog.create({
        data: {
          performedById: req.user?.id || null,
          action: 'SCHOLAR_POSTS_BULK_DELETED',
          notes: `Removed ${deletedRows.length} selected scholar post${deletedRows.length === 1 ? '' : 's'} from the landing page.`,
        },
      });
    }

    res.json({
      success: true,
      message: `${deletedRows.length} posted scholar${deletedRows.length === 1 ? '' : 's'} removed from the landing page.`,
      deletedCount: deletedRows.length,
    });
  } catch (err) {
    next(err);
  }
};

const deleteAllScholarPosts = async (req, res, next) => {
  try {
    await ensureScholarPostsTable();

    const deletedRows = await prisma.$queryRaw`
      DELETE FROM "scholar_posts"
      RETURNING "application_id"
    `;

    if (deletedRows.length > 0) {
      await prisma.activityLog.create({
        data: {
          performedById: req.user?.id || null,
          action: 'SCHOLAR_POSTS_CLEARED',
          notes: `Cleared all ${deletedRows.length} scholar post${deletedRows.length === 1 ? '' : 's'} from the landing page.`,
        },
      });
    }

    res.json({
      success: true,
      message: deletedRows.length
        ? `All posted scholars were removed from the landing page.`
        : 'There were no posted scholars to remove.',
      deletedCount: deletedRows.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicScholarPosts,
  getAdminScholarPosts,
  publishAcceptedScholars,
  deleteScholarPost,
  deleteManyScholarPosts,
  deleteAllScholarPosts,
};
