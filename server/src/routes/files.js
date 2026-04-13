const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const prisma = new PrismaClient();
const privateUploadsDir = path.join(__dirname, '../../private_uploads');
const legacyUploadsDir = path.join(__dirname, '../../uploads');

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'];

const resolveExistingFilePath = (fileUrl) => {
  const baseName = path.basename(String(fileUrl || ''));
  const candidates = [
    path.join(privateUploadsDir, baseName),
    path.join(legacyUploadsDir, baseName),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

// Returns the applicationId if the requesting user is allowed to access it.
// Applicants may only access their own application; all staff roles may access any.
const canAccessApplication = async (applicationId, user) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { applicantId: true },
  });
  if (!application) throw new AppError('Application not found', 404);

  const isStaff = STAFF_ROLES.includes(user.role);
  if (!isStaff && application.applicantId !== user.id) {
    throw new AppError('Forbidden', 403);
  }

  return application;
};

router.get('/requirements/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await prisma.requirementFile.findUnique({ where: { id } });
    if (!file) throw new AppError('File not found', 404);

    await canAccessApplication(file.applicationId, req.user);

    const filePath = resolveExistingFilePath(file.fileUrl);
    if (!filePath) throw new AppError('File not found', 404);

    logger.info('Requirement file accessed', {
      fileId: id,
      fileName: file.fileName,
      applicationId: file.applicationId,
      accessedBy: req.user.id,
      role: req.user.role,
      ip: req.ip,
    });

    res.setHeader('Content-Disposition', `inline; filename="${path.basename(file.fileName || 'document')}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

router.get('/cor/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await prisma.corFile.findUnique({ where: { id } });
    if (!file) throw new AppError('File not found', 404);

    await canAccessApplication(file.applicationId, req.user);

    const filePath = resolveExistingFilePath(file.fileUrl);
    if (!filePath) throw new AppError('File not found', 404);

    logger.info('COR file accessed', {
      fileId: id,
      applicationId: file.applicationId,
      accessedBy: req.user.id,
      role: req.user.role,
      ip: req.ip,
    });

    res.setHeader('Content-Disposition', `inline; filename="${path.basename(file.fileName || 'cor.pdf')}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await prisma.requirementFile.findUnique({ where: { id } });
    if (!file) throw new AppError('File not found', 404);

    const application = await canAccessApplication(file.applicationId, req.user);

    // Only the owning applicant or staff may delete requirement files.
    const isStaff = STAFF_ROLES.includes(req.user.role);
    if (!isStaff && application.applicantId !== req.user.id) {
      throw new AppError('Forbidden', 403);
    }

    const filePath = resolveExistingFilePath(file.fileUrl);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.requirementFile.delete({ where: { id } });

    logger.info('Requirement file deleted', {
      fileId: id,
      fileName: file.fileName,
      applicationId: file.applicationId,
      deletedBy: req.user.id,
      role: req.user.role,
    });

    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
