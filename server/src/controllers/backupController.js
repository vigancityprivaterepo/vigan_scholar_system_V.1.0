const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { pipeline } = require('stream/promises')
const { Readable } = require('stream')
const multer = require('multer')
const logger = require('../utils/logger')
const { AppError } = require('../middleware/errorHandler')

const BACKUP_DIR = path.resolve('backups')
const BACKUP_VERSION = '2'
const FILENAME_RE = /^(backup|pre-restore)-[\w\-]+\.json\.gz$/
const MAX_BACKUP_UPLOAD_MB = parseInt(process.env.BACKUP_UPLOAD_MAX_MB || '250', 10)
const UPLOAD_DIRECTORIES = {
  privateUploads: path.resolve(__dirname, '../../private_uploads'),
  publicUploads: path.resolve(__dirname, '../../public_uploads'),
  legacyUploads: path.resolve(__dirname, '../../uploads'),
}

fs.mkdirSync(BACKUP_DIR, { recursive: true })
for (const dir of Object.values(UPLOAD_DIRECTORIES)) {
  fs.mkdirSync(dir, { recursive: true })
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BACKUP_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.json.gz')) return cb(null, true)
    cb(new AppError('Only .json.gz backup files are accepted', 400))
  },
})

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
    scholarshipRenewals,
    renewalFiles,
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
    prisma.scholarshipRenewal.findMany(),
    prisma.renewalFile.findMany(),
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
    scholarshipRenewals,
    renewalFiles,
  }
}

function collectDirectoryFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return []

  const walk = (currentDir, baseDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        files.push(...walk(absolutePath, baseDir))
        continue
      }

      const relativePath = path.relative(baseDir, absolutePath).split(path.sep).join('/')
      const content = fs.readFileSync(absolutePath)
      const stat = fs.statSync(absolutePath)
      files.push({
        path: relativePath,
        size: stat.size,
        contentBase64: content.toString('base64'),
      })
    }

    return files
  }

  return walk(dirPath, dirPath)
}

function collectAllFiles() {
  const files = {}
  const fileCounts = {}

  for (const [key, dirPath] of Object.entries(UPLOAD_DIRECTORIES)) {
    const directoryFiles = collectDirectoryFiles(dirPath)
    files[key] = directoryFiles
    fileCounts[key] = directoryFiles.length
  }

  return { files, fileCounts }
}

async function writeBackupFile(filepath, data, meta) {
  const counts = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v.length])
  )
  const { files, fileCounts } = collectAllFiles()
  const payload = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    ...meta,
    note: 'Includes database records and uploaded files from private_uploads, public_uploads, and legacy uploads directories.',
    counts,
    fileCounts,
    data,
    files,
  }

  const json = JSON.stringify(payload)
  await pipeline(
    Readable.from([json]),
    zlib.createGzip(),
    fs.createWriteStream(filepath)
  )

  return { counts, fileCounts, size: fs.statSync(filepath).size }
}

function clearDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    return
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    fs.rmSync(path.join(dirPath, entry.name), { recursive: true, force: true })
  }
}

function restoreFileDirectories(files) {
  if (!files || typeof files !== 'object') return false

  for (const [key, dirPath] of Object.entries(UPLOAD_DIRECTORIES)) {
    clearDirectory(dirPath)
    const directoryFiles = Array.isArray(files?.[key]) ? files[key] : []

    for (const file of directoryFiles) {
      const normalizedRelativePath = String(file.path || '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
      if (!normalizedRelativePath || normalizedRelativePath.includes('..')) {
        throw new AppError(`Invalid backup file path in ${key}`, 400)
      }

      const destination = path.join(dirPath, normalizedRelativePath)
      const resolvedDestination = path.resolve(destination)
      const resolvedBaseDir = path.resolve(dirPath)
      if (!resolvedDestination.startsWith(`${resolvedBaseDir}${path.sep}`) && resolvedDestination !== resolvedBaseDir) {
        throw new AppError(`Invalid backup file path in ${key}`, 400)
      }

      fs.mkdirSync(path.dirname(destination), { recursive: true })
      fs.writeFileSync(destination, Buffer.from(file.contentBase64 || '', 'base64'))
    }
  }

  return true
}

function decompressBackupBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const gunzip = zlib.createGunzip()
    Readable.from([buffer]).pipe(gunzip)
    gunzip.on('data', chunk => chunks.push(chunk))
    gunzip.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    gunzip.on('error', reject)
  })
}

const createBackup = async (req, res, next) => {
  try {
    const data = await collectAllData()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.json.gz`
    const filepath = path.join(BACKUP_DIR, filename)

    const { counts, fileCounts, size } = await writeBackupFile(filepath, data, {
      createdBy: req.user.email,
    })

    logger.info('Backup created', { filename, bytes: size, by: req.user.email, fileCounts })

    res.status(201).json({
      message: 'Backup created successfully',
      filename,
      size,
      createdAt: new Date().toISOString(),
      counts,
      fileCounts,
    })
  } catch (err) {
    next(err)
  }
}

const listBackups = (_req, res, next) => {
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

async function runRestoreFromBuffer(buffer, originalName, userEmail, res, next) {
  try {
    const decompressed = await decompressBackupBuffer(buffer)

    let backup
    try {
      backup = JSON.parse(decompressed)
    } catch {
      return next(new AppError('Invalid backup file: could not parse JSON', 400))
    }

    if (!backup.version || !backup.data) {
      return next(new AppError('Invalid backup file: missing version or data fields', 400))
    }

    const snapshotTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const snapshotFilename = `pre-restore-${snapshotTimestamp}.json.gz`
    const snapshotPath = path.join(BACKUP_DIR, snapshotFilename)
    try {
      const currentData = await collectAllData()
      await writeBackupFile(snapshotPath, currentData, {
        createdBy: userEmail,
        snapshotReason: `Auto-snapshot before restoring ${originalName}`,
      })
      logger.info('Pre-restore snapshot saved', { filename: snapshotFilename })
    } catch (snapErr) {
      logger.warn('Could not create pre-restore snapshot', { error: snapErr.message })
    }

    const { data } = backup
    const restoredFileCounts = Object.fromEntries(
      Object.entries(UPLOAD_DIRECTORIES).map(([key]) => [key, Array.isArray(backup.files?.[key]) ? backup.files[key].length : 0])
    )

    logger.info('Starting full system restore', {
      backupCreatedAt: backup.createdAt,
      counts: backup.counts,
      fileCounts: backup.fileCounts || restoredFileCounts,
      by: userEmail,
    })

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany()
      await tx.notification.deleteMany()
      await tx.activityLog.deleteMany()
      await tx.communicationLog.deleteMany()
      await tx.emailJob.deleteMany()
      await tx.appeal.deleteMany()
      await tx.examSchedule.deleteMany()
      await tx.renewalFile.deleteMany()
      await tx.scholarshipRenewal.deleteMany()
      await tx.corFile.deleteMany()
      await tx.requirementFile.deleteMany()
      await tx.application.deleteMany()
      await tx.carouselSlide.deleteMany()
      await tx.siteSetting.deleteMany()
      await tx.user.deleteMany()

      if (data.users?.length) await tx.user.createMany({ data: data.users })
      if (data.applications?.length) await tx.application.createMany({ data: data.applications })
      if (data.requirementFiles?.length) await tx.requirementFile.createMany({ data: data.requirementFiles })
      if (data.corFiles?.length) await tx.corFile.createMany({ data: data.corFiles })
      if (data.scholarshipRenewals?.length) await tx.scholarshipRenewal.createMany({ data: data.scholarshipRenewals })
      if (data.renewalFiles?.length) await tx.renewalFile.createMany({ data: data.renewalFiles })
      if (data.examSchedules?.length) await tx.examSchedule.createMany({ data: data.examSchedules })
      if (data.appeals?.length) await tx.appeal.createMany({ data: data.appeals })
      if (data.activityLogs?.length) await tx.activityLog.createMany({ data: data.activityLogs })
      if (data.communicationLogs?.length) await tx.communicationLog.createMany({ data: data.communicationLogs })
      if (data.emailJobs?.length) await tx.emailJob.createMany({ data: data.emailJobs })
      if (data.notifications?.length) await tx.notification.createMany({ data: data.notifications })
      if (data.carouselSlides?.length) await tx.carouselSlide.createMany({ data: data.carouselSlides })
      if (data.siteSettings?.length) await tx.siteSetting.createMany({ data: data.siteSettings })
    }, { timeout: 120000 })

    const filesRestored = restoreFileDirectories(backup.files)

    logger.info('Full system restore completed successfully', { by: userEmail, restoredFileCounts, filesRestored })

    res.json({
      message: 'Backup restored successfully. Database records and uploaded files have been replaced. All active sessions have been invalidated; please log in again.',
      restoredFrom: backup.createdAt,
      counts: backup.counts,
      fileCounts: backup.fileCounts || restoredFileCounts,
      snapshotSaved: snapshotFilename,
      includesFiles: filesRestored,
    })
  } catch (err) {
    next(err)
  }
}

const restoreBackup = (req, res, next) => {
  if (!req.file) return next(new AppError('No backup file uploaded', 400))
  return runRestoreFromBuffer(req.file.buffer, req.file.originalname, req.user.email, res, next)
}

const restoreBackupFromServer = (req, res, next) => {
  const { filename } = req.params
  if (!FILENAME_RE.test(filename)) return next(new AppError('Invalid backup filename', 400))
  const filepath = path.join(BACKUP_DIR, filename)
  if (!fs.existsSync(filepath)) return next(new AppError('Backup file not found', 404))
  const buffer = fs.readFileSync(filepath)
  return runRestoreFromBuffer(buffer, filename, req.user.email, res, next)
}

module.exports = { createBackup, listBackups, downloadBackup, deleteBackup, restoreBackup, restoreBackupFromServer, upload }
