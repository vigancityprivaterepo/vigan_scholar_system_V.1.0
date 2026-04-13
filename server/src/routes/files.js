const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();
const privateUploadsDir = path.join(__dirname, '../../private_uploads');
const legacyUploadsDir = path.join(__dirname, '../../uploads');

const resolveExistingFilePath = (fileUrl) => {
  const baseName = path.basename(String(fileUrl || ''));
  const candidates = [
    path.join(privateUploadsDir, baseName),
    path.join(legacyUploadsDir, baseName),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

const canAccessApplication = async (applicationId, user) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { applicantId: true },
  });
  if (!application) throw new AppError('Application not found', 404);

  if (application.applicantId !== user.id && user.role !== 'ADMIN') {
    throw new AppError('Forbidden', 403);
  }
};

router.get('/requirements/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await prisma.requirementFile.findUnique({ where: { id } });
    if (!file) throw new AppError('File not found', 404);

    await canAccessApplication(file.applicationId, req.user);

    const filePath = resolveExistingFilePath(file.fileUrl);
    if (!filePath) throw new AppError('File not found', 404);

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

    const application = await prisma.application.findUnique({
      where: { id: file.applicationId },
    });
    if (application.applicantId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('Forbidden', 403);
    }

    const filePath = resolveExistingFilePath(file.fileUrl);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.requirementFile.delete({ where: { id } });
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
