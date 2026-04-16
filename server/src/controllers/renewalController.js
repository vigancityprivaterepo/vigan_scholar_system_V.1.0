const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/errorHandler');
const { toAcademicYear } = require('../utils/academicYear');
const { createNotification } = require('../services/notificationService');

const prisma = new PrismaClient();

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'];

// ── Applicant: submit renewal ────────────────────────────────────────────────
const submitRenewal = async (req, res, next) => {
  try {
    const applicantId = req.user.id;

    // Must have an ACCEPTED application
    const application = await prisma.application.findFirst({
      where: { applicantId, status: 'ACCEPTED' },
    });
    if (!application) {
      throw new AppError('Only scholars with ACCEPTED status may submit a renewal.', 403);
    }

    // Only one active (non-rejected) renewal allowed at a time
    const existing = await prisma.scholarshipRenewal.findFirst({
      where: { applicantId, status: { in: ['PENDING_REVIEW', 'APPROVED'] } },
    });
    if (existing) {
      throw new AppError('You already have a pending or approved renewal application.', 409);
    }

    // upload.fields() returns req.files as { cor: [...], grades: [...] }
    const corFiles = req.files?.cor || [];
    const gradesFiles = req.files?.grades || [];
    const allFiles = [...corFiles, ...gradesFiles];
    if (!allFiles.length) {
      throw new AppError('Please upload at least one renewal document.', 400);
    }

    const renewal = await prisma.scholarshipRenewal.create({
      data: {
        applicantId,
        applicationId: application.id,
        status: 'PENDING_REVIEW',
        academicYear: toAcademicYear(new Date()),
      },
    });

    const fileData = allFiles.map((file) => ({
      renewalId: renewal.id,
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
      fileType: file.mimetype,
      docType: file.fieldname === 'cor' ? 'COR' : 'GRADES',
    }));
    await prisma.renewalFile.createMany({ data: fileData });

    await createNotification({
      userId: applicantId,
      applicationId: application.id,
      title: 'Renewal Application Submitted',
      message: `Your scholarship renewal has been submitted for review. Reference: ${renewal.id.slice(0, 8).toUpperCase()}`,
      type: 'SUCCESS',
    });

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { id: true } });
    const user = await prisma.user.findUnique({ where: { id: applicantId } });
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          applicationId: application.id,
          title: 'New Renewal Application',
          message: `${user.fullName} submitted a scholarship renewal. Ref: ${renewal.id.slice(0, 8).toUpperCase()}`,
          type: 'INFO',
        })),
      });
    }

    res.status(201).json({ success: true, message: 'Renewal submitted successfully.', renewal });
  } catch (err) {
    next(err);
  }
};

// ── Applicant: get my renewal ────────────────────────────────────────────────
const getMyRenewal = async (req, res, next) => {
  try {
    const renewal = await prisma.scholarshipRenewal.findFirst({
      where: { applicantId: req.user.id },
      orderBy: { submittedAt: 'desc' },
      include: { renewalFiles: true },
    });
    res.json({ success: true, renewal: renewal || null });
  } catch (err) {
    next(err);
  }
};

// ── Admin: list all renewals ─────────────────────────────────────────────────
const adminListRenewals = async (req, res, next) => {
  try {
    const renewals = await prisma.scholarshipRenewal.findMany({
      orderBy: { submittedAt: 'desc' },
      include: {
        applicant: { select: { fullName: true, email: true } },
        renewalFiles: true,
      },
    });
    res.json({ success: true, renewals });
  } catch (err) {
    next(err);
  }
};

// ── Admin: get single renewal ────────────────────────────────────────────────
const adminGetRenewal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const renewal = await prisma.scholarshipRenewal.findUnique({
      where: { id },
      include: {
        applicant: { select: { fullName: true, email: true } },
        application: { select: { id: true, lastName: true, firstName: true, middleName: true, address: true, contact: true, generalAverage: true, school: true, yearGraduated: true } },
        renewalFiles: true,
      },
    });
    if (!renewal) throw new AppError('Renewal not found', 404);
    res.json({ success: true, renewal });
  } catch (err) {
    next(err);
  }
};

// ── Admin: approve or reject renewal ────────────────────────────────────────
const adminUpdateRenewalStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new AppError('Status must be APPROVED or REJECTED.', 400);
    }

    const renewal = await prisma.scholarshipRenewal.findUnique({ where: { id } });
    if (!renewal) throw new AppError('Renewal not found', 404);
    if (renewal.status !== 'PENDING_REVIEW') {
      throw new AppError('Only pending renewals can be updated.', 400);
    }

    const updated = await prisma.scholarshipRenewal.update({
      where: { id },
      data: { status, adminRemarks: adminRemarks || null },
    });

    await createNotification({
      userId: renewal.applicantId,
      applicationId: renewal.applicationId,
      title: status === 'APPROVED' ? 'Renewal Approved' : 'Renewal Rejected',
      message: status === 'APPROVED'
        ? 'Your scholarship renewal application has been approved. Congratulations!'
        : `Your renewal was not approved.${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`,
      type: status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
    });

    res.json({ success: true, message: `Renewal ${status.toLowerCase()}.`, renewal: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitRenewal,
  getMyRenewal,
  adminListRenewals,
  adminGetRenewal,
  adminUpdateRenewalStatus,
};
