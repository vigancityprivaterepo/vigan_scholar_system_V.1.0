const { prisma } = require('../db/prismaClient')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { pipeline } = require('stream/promises')
const { Readable } = require('stream')
const multer = require('multer')
const logger = require('../utils/logger')
const AppError = require('../utils/AppError')

const BACKUP_DIR = path.resolve('backups')
const BACKUP_VERSION = '1'
const FILENAME_RE = /^(backup|pre-restore)-[\w\-]+\.json\.gz$/

// Ensure backups directory exists on startup
fs.mkdirSync(BACKUP_DIR, { recursive: true })

// Multer: memory storage, 50 MB limit, .json.gz only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.json.gz')) return cb(null, true)
    cb(new AppError('Only .json.gz backup files are accepted', 400))
  },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function collectAllData() {
  const [
    users,
    applications,
    requirementFiles,
    corFiles,
    activityLogs,
    communicationLogs,
    emailJobs,
    appeals,
    examSchedules,
    carouselSlides,
    siteSettings,
    notifications,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.application.findMany(),
    prisma.requirementFile.findMany(),
    prisma.corFile.findMany(),
    prisma.activityLog.findMany(),
    prisma.communicationLog.findMany(),
    prisma.emailJob.findMany(),
    prisma.appeal.findMany(),
    prisma.examSchedule.findMany(),
    prisma.carouselSlide.findMany(),
    prisma.siteSetting.findMany(),
    prisma.notification.findMany(),
  ])
  return {
    users,
    applications,
    requirementFiles,
    corFiles,
    activityLogs,
    communicationLogs,
    emailJobs,
    appeals,
    examSchedules,
    carouselSlides,
    siteSettings,
    notifications,
  }
}

async function writeBackupFile(filepath, data, meta) {
  const counts = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v.length])
  )
  const payload = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    ...meta,
    note: 'Uploaded files (documents, COR files, carousel images) are NOT included. Back up server/private_uploads and server/public_uploads directories separately.',
    counts,
    data,
  }
  const json = JSON.stringify(payload)
  await pipeline(
    Readable.from([json]),
    zlib.createGzip(),
    fs.createWriteStream(filepath)
  )
  return { counts, size: fs.statSync(filepath).size }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

const createBackup = async (req, res, next) => {
  try {
    const data = await collectAllData()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.json.gz`
    const filepath = path.join(BACKUP_DIR, filename)

    const { counts, size } = await writeBackupFile(filepath, data, {
      createdBy: req.user.email,
    })

    logger.info('Backup created', { filename, bytes: size, by: req.user.email })

    res.status(201).json({
      message: 'Backup created successfully',
      filename,
      size,
      createdAt: new Date().toISOString(),
      counts,
    })
  } catch (err) {
    next(err)
  }
}

const listBackups = (req, res, next) => {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter(f => FILENAME_RE.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f))
        return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    res.json({ backups: files })
  } catch (err) {
    next(err)
  }
}

const downloadBackup = (req, res, next) => {
  try {
    const { filename } = req.params
    if (!FILENAME_RE.test(filename)) throw new AppError('Invalid backup filename', 400)
    const filepath = path.join(BACKUP_DIR, filename)
    if (!fs.existsSync(filepath)) throw new AppError('Backup file not found', 404)

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'application/gzip')
    fs.createReadStream(filepath).pipe(res)
  } catch (err) {
    next(err)
  }
}

const deleteBackup = (req, res, next) => {
  try {
    const { filename } = req.params
    if (!FILENAME_RE.test(filename)) throw new AppError('Invalid backup filename', 400)
    const filepath = path.join(BACKUP_DIR, filename)
    if (!fs.existsSync(filepath)) throw new AppError('Backup file not found', 404)

    fs.unlinkSync(filepath)
    logger.info('Backup deleted', { filename, by: req.user.email })
    res.json({ message: 'Backup deleted' })
  } catch (err) {
    next(err)
  }
}

const restoreBackup = async (req, res, next) => {
  if (!req.file) return next(new AppError('No backup file uploaded', 400))

  try {
    // 1. Decompress uploaded file
    const decompressed = await new Promise((resolve, reject) => {
      const chunks = []
      const gunzip = zlib.createGunzip()
      Readable.from([req.file.buffer]).pipe(gunzip)
      gunzip.on('data', chunk => chunks.push(chunk))
      gunzip.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      gunzip.on('error', reject)
    })

    // 2. Parse and validate
    let backup
    try { backup = JSON.parse(decompressed) } catch {
      throw new AppError('Invalid backup file: could not parse JSON', 400)
    }
    if (!backup.version || !backup.data) {
      throw new AppError('Invalid backup file: missing version or data fields', 400)
    }

    // 3. Auto-snapshot current state before overwriting
    const snapshotTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const snapshotFilename = `pre-restore-${snapshotTimestamp}.json.gz`
    const snapshotPath = path.join(BACKUP_DIR, snapshotFilename)
    try {
      const currentData = await collectAllData()
      await writeBackupFile(snapshotPath, currentData, {
        createdBy: req.user.email,
        snapshotReason: `Auto-snapshot before restoring ${req.file.originalname}`,
      })
      logger.info('Pre-restore snapshot saved', { filename: snapshotFilename })
    } catch (snapErr) {
      logger.warn('Could not create pre-restore snapshot', { error: snapErr.message })
      // Non-fatal — continue with restore
    }

    const { data } = backup

    logger.info('Starting database restore', {
      backupCreatedAt: backup.createdAt,
      counts: backup.counts,
      by: req.user.email,
    })

    // 4. Delete all rows (respect FK order) then re-insert — wrapped in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete in reverse FK dependency order
      await tx.refreshToken.deleteMany()
      await tx.notification.deleteMany()
      await tx.activityLog.deleteMany()
      await tx.communicationLog.deleteMany()
      await tx.emailJob.deleteMany()
      await tx.appeal.deleteMany()
      await tx.examSchedule.deleteMany()
      await tx.corFile.deleteMany()
      await tx.requirementFile.deleteMany()
      await tx.application.deleteMany()
      await tx.carouselSlide.deleteMany()
      await tx.siteSetting.deleteMany()
      await tx.user.deleteMany()

      // Insert in FK dependency order
      if (data.users?.length)            await tx.user.createMany({ data: data.users })
      if (data.applications?.length)     await tx.application.createMany({ data: data.applications })
      if (data.requirementFiles?.length) await tx.requirementFile.createMany({ data: data.requirementFiles })
      if (data.corFiles?.length)         await tx.corFile.createMany({ data: data.corFiles })
      if (data.examSchedules?.length)    await tx.examSchedule.createMany({ data: data.examSchedules })
      if (data.appeals?.length)          await tx.appeal.createMany({ data: data.appeals })
      if (data.activityLogs?.length)     await tx.activityLog.createMany({ data: data.activityLogs })
      if (data.communicationLogs?.length) await tx.communicationLog.createMany({ data: data.communicationLogs })
      if (data.emailJobs?.length)        await tx.emailJob.createMany({ data: data.emailJobs })
      if (data.notifications?.length)    await tx.notification.createMany({ data: data.notifications })
      if (data.carouselSlides?.length)   await tx.carouselSlide.createMany({ data: data.carouselSlides })
      if (data.siteSettings?.length)     await tx.siteSetting.createMany({ data: data.siteSettings })
    }, { timeout: 120000 })

    logger.info('Database restore completed successfully', { by: req.user.email })

    res.json({
      message: 'Database restored successfully. All active sessions have been invalidated — please log in again.',
      restoredFrom: backup.createdAt,
      counts: backup.counts,
      snapshotSaved: snapshotFilename,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { createBackup, listBackups, downloadBackup, deleteBackup, restoreBackup, upload }
