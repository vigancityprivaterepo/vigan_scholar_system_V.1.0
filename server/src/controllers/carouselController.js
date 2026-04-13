const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();
const publicUploadsDir = path.join(__dirname, '../../public_uploads');
const legacyUploadsDir = path.join(__dirname, '../../uploads');
let didRunLegacyMigration = false;

const normalizePublicUrl = (rawUrl) => {
  const baseName = path.basename(String(rawUrl || ''));
  return baseName ? `/public-uploads/${baseName}` : '';
};

const runLegacyCarouselMigration = async () => {
  if (didRunLegacyMigration) return;
  didRunLegacyMigration = true;

  const legacySlides = await prisma.carouselSlide.findMany({
    where: { imageUrl: { startsWith: '/uploads/' } },
    select: { id: true, imageUrl: true },
  });

  for (const slide of legacySlides) {
    const baseName = path.basename(slide.imageUrl);
    const source = path.join(legacyUploadsDir, baseName);
    const destination = path.join(publicUploadsDir, baseName);

    try {
      if (fs.existsSync(source) && !fs.existsSync(destination)) {
        fs.copyFileSync(source, destination);
      }

      if (fs.existsSync(destination)) {
        await prisma.carouselSlide.update({
          where: { id: slide.id },
          data: { imageUrl: normalizePublicUrl(slide.imageUrl) },
        });
      }
    } catch (err) {
      console.warn(`Carousel legacy migration skipped for ${slide.id}: ${err.message}`);
    }
  }
};

const resolveImagePathForDeletion = (imageUrl) => {
  const baseName = path.basename(String(imageUrl || ''));
  const candidates = [
    path.join(publicUploadsDir, baseName),
    path.join(legacyUploadsDir, baseName),
  ];
  return candidates.find((target) => fs.existsSync(target)) || null;
};

const getPublicSlides = async (req, res, next) => {
  try {
    await runLegacyCarouselMigration();
    const slides = await prisma.carouselSlide.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    const normalized = slides.map((slide) => ({
      ...slide,
      imageUrl: slide.imageUrl.startsWith('/uploads/') ? normalizePublicUrl(slide.imageUrl) : slide.imageUrl,
    }));
    res.json({ success: true, slides: normalized });
  } catch (err) {
    next(err);
  }
};

const getAllSlides = async (req, res, next) => {
  try {
    await runLegacyCarouselMigration();
    const slides = await prisma.carouselSlide.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const normalized = slides.map((slide) => ({
      ...slide,
      imageUrl: slide.imageUrl.startsWith('/uploads/') ? normalizePublicUrl(slide.imageUrl) : slide.imageUrl,
    }));
    res.json({ success: true, slides: normalized });
  } catch (err) {
    next(err);
  }
};

const createSlide = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('Image is required', 400);
    const { label, caption, sortOrder } = req.body;
    if (!label || !caption) throw new AppError('Label and caption are required', 400);

    const slide = await prisma.carouselSlide.create({
      data: {
        imageUrl: `/public-uploads/${req.file.filename}`,
        label,
        caption,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      },
    });
    res.status(201).json({ success: true, slide });
  } catch (err) {
    next(err);
  }
};

const updateSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.carouselSlide.findUnique({ where: { id } });
    if (!existing) throw new AppError('Slide not found', 404);

    const { label, caption, sortOrder, isActive } = req.body;
    const updateData = {};
    if (label !== undefined) updateData.label = label;
    if (caption !== undefined) updateData.caption = caption;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      const oldPath = resolveImagePathForDeletion(existing.imageUrl);
      if (oldPath && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      updateData.imageUrl = `/public-uploads/${req.file.filename}`;
    }

    const slide = await prisma.carouselSlide.update({ where: { id }, data: updateData });
    res.json({ success: true, slide });
  } catch (err) {
    next(err);
  }
};

const deleteSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.carouselSlide.findUnique({ where: { id } });
    if (!existing) throw new AppError('Slide not found', 404);

    const imagePath = resolveImagePathForDeletion(existing.imageUrl);
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    await prisma.carouselSlide.delete({ where: { id } });
    res.json({ success: true, message: 'Slide deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPublicSlides, getAllSlides, createSlide, updateSlide, deleteSlide };
