const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

router.get('/:filename', authenticate, async (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);
    if (!fs.existsSync(filePath)) throw new AppError('File not found', 404);
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

    const filePath = path.join(__dirname, '../../uploads', path.basename(file.fileUrl));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.requirementFile.delete({ where: { id } });
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
