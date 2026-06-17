const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { finished } = require('stream/promises')
const { Readable } = require('stream')
const multer = require('multer')
const logger = require('../utils/logger')
const { AppError } = require('../middleware/errorHandler')

const SERVER_ROOT = path.resolve(__dirname, '../..')
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(SERVER_ROOT, 'backups'))
const RESTORE_UPLOAD_DIR = path.join(BACKUP_DIR, '_restore_uploads')
const BACKUP_VERSION = '2'
const FILENAME_RE = /^(backup|pre-restore)-[\w\-]+\.json\.gz$/
const MAX_BACKUP_UPLOAD_MB = parseInt(process.env.BACKUP_UPLOAD_MAX_MB || '4096', 10)
const OPTIONAL_SCHEMA_ERROR_CODES = new Set(['P2021', 'P2022'])
const UPLOAD_DIRECTORIES = {
  privateUploads: path.resolve(__dirname, '../../private_uploads'),
  publicUploads: path.resolve(__dirname, '../../public_uploads'),
  legacyUploads: path.resolve(__dirname, '../../uploads'),
}
const BACKUP_DATASETS = [
  { key: 'users', optional: false, read: () => prisma.user.findMany() },
  { key: 'applications', optional: false, read: () => prisma.application.findMany() },
  { key: 'requirementFiles', optional: false, read: () => prisma.requirementFile.findMany() },
  { key: 'corFiles', optional: false, read: () => prisma.corFile.findMany() },
  { key: 'activityLogs', optional: false, read: () => prisma.activityLog.findMany() },
  { key: 'communicationLogs', optional: true, read: () => prisma.communicationLog.findMany() },
  { key: 'emailJobs', optional: true, read: () => prisma.emailJob.findMany() },
  { key: 'appeals', optional: true, read: () => prisma.appeal.findMany() },
  { key: 'examSchedules', optional: false, read: () => prisma.examSchedule.findMany() },
  { key: 'carouselSlides', optional: true, read: () => prisma.carouselSlide.findMany() },
  { key: 'siteSettings', optional: true, read: () => prisma.siteSetting.findMany() },
  { key: 'notifications', optional: false, read: () => prisma.notification.findMany() },
  { key: 'scholarshipRenewals', optional: true, read: () => prisma.scholarshipRenewal.findMany() },
  { key: 'renewalFiles', optional: true, read: () => prisma.renewalFile.findMany() },
]

function ensureRuntimeDirectories() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  fs.mkdirSync(RESTORE_UPLOAD_DIR, { recursive: true })
  for (const dir of Object.values(UPLOAD_DIRECTORIES)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

ensureRuntimeDirectories()

function isSchemaDriftError(err) {
  return OPTIONAL_SCHEMA_ERROR_CODES.has(err?.code)
}

function serializeBackupPayload(payload) {
  return JSON.stringify(payload, (_key, value) => {
    if (typeof value === 'bigint') return value.toString()
    if (value && typeof value === 'object') {
      if (typeof value.toJSON === 'function') return value.toJSON()
      if (value.constructor?.name === 'Decimal' && typeof value.toString === 'function') {
        return value.toString()
      }
    }
    return value
  })
}

function serializeBackupValue(value) {
  return serializeBackupPayload(value)
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureRuntimeDirectories()
      cb(null, RESTORE_UPLOAD_DIR)
    },
    filename: (_req, file, cb) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const safeName = path.basename(file.originalname || `restore-${timestamp}.json.gz`).replace(/[^\w.\-]/g, '_')
      cb(null, `${timestamp}-${safeName}`)
    },
  }),
  limits: { fileSize: MAX_BACKUP_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.json.gz')) return cb(null, true)
    cb(new AppError('Only .json.gz backup files are accepted', 400))
  },
})

async function collectAllData() {
  const entries = await Promise.all(
    BACKUP_DATASETS.map(async ({ key, read }) => {
      try {
        return [key, await read()]
      } catch (err) {
        if (isSchemaDriftError(err)) {
          logger.warn('Skipping backup dataset because the database schema is behind this code version', {
            dataset: key,
            code: err.code,
            message: err.message,
          })
          return [key, []]
        }
        throw err
      }
    })
  )

  return Object.fromEntries(entries)
}

async function runRestoreStep(step, work, optional = false) {
  try {
    await work()
  } catch (err) {
    if (optional && OPTIONAL_SCHEMA_ERROR_CODES.has(err?.code)) {
      logger.warn('Skipping restore step because the database schema is behind this code version', {
        step,
        code: err.code,
        message: err.message,
      })
      return false
    }
    throw err
  }

  return true
}

async function walkDirectoryFiles(dirPath, visitor) {
  if (!fs.existsSync(dirPath)) return

  const walk = async (currentDir, baseDir) => {
    let entries = []
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true })
    } catch (err) {
      logger.warn('Skipping unreadable directory while creating backup', {
        directory: currentDir,
        message: err.message,
      })
      return
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await walk(absolutePath, baseDir)
        continue
      }

      await visitor(absolutePath, baseDir)
    }
  }

  await walk(dirPath, dirPath)
}

function collectFileCounts() {
  const fileCounts = {}

  for (const [key, dirPath] of Object.entries(UPLOAD_DIRECTORIES)) {
    let count = 0
    if (!fs.existsSync(dirPath)) {
      fileCounts[key] = 0
      continue
    }
    const walk = (currentDir, baseDir) => {
      let entries = []
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true })
      } catch (err) {
        logger.warn('Skipping unreadable directory while counting backup files', {
          directory: currentDir,
          message: err.message,
        })
        return
      }

      for (const entry of entries) {
        const absolutePath = path.join(currentDir, entry.name)
        if (entry.isDirectory()) {
          walk(absolutePath, baseDir)
          continue
        }

        try {
          fs.statSync(absolutePath)
          const relativePath = path.relative(baseDir, absolutePath).split(path.sep).join('/')
          if (relativePath) count += 1
        } catch (err) {
          logger.warn('Skipping unreadable file while counting backup files', {
            file: absolutePath,
            message: err.message,
          })
        }
      }
    }
    walk(dirPath, dirPath)
    fileCounts[key] = count
  }

  return fileCounts
}

async function writeChunk(stream, chunk) {
  if (stream.write(chunk)) return
  await new Promise(resolve => stream.once('drain', resolve))
}

async function writeBackupFile(filepath, data, meta, options = {}) {
  const includeFiles = options.includeFiles !== false
  const counts = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v.length])
  )
  const fileCounts = includeFiles
    ? collectFileCounts()
    : Object.fromEntries(Object.keys(UPLOAD_DIRECTORIES).map((key) => [key, 0]))
  const gzip = zlib.createGzip()
  const fileStream = fs.createWriteStream(filepath)
  gzip.pipe(fileStream)

  try {
    await writeChunk(gzip, '{')
    await writeChunk(gzip, `"version":${serializeBackupValue(BACKUP_VERSION)}`)
    await writeChunk(gzip, `,"createdAt":${serializeBackupValue(new Date().toISOString())}`)

    for (const [key, value] of Object.entries(meta)) {
      await writeChunk(gzip, `,${serializeBackupValue(key)}:${serializeBackupValue(value)}`)
    }

    await writeChunk(gzip, `,"note":${serializeBackupValue(includeFiles
      ? 'Includes database records and uploaded files from private_uploads, public_uploads, and legacy uploads directories.'
      : 'Includes database records only. Uploaded files are intentionally excluded for a lightweight backup.'
    )}`)
    await writeChunk(gzip, `,"includesFiles":${serializeBackupValue(includeFiles)}`)
    await writeChunk(gzip, `,"counts":${serializeBackupValue(counts)}`)
    await writeChunk(gzip, `,"fileCounts":${serializeBackupValue(fileCounts)}`)

    await writeChunk(gzip, ',"data":{')
    let firstDataset = true
    for (const [key, value] of Object.entries(data)) {
      if (!firstDataset) await writeChunk(gzip, ',')
      firstDataset = false
      await writeChunk(gzip, `${serializeBackupValue(key)}:${serializeBackupValue(value)}`)
    }
    await writeChunk(gzip, '}')

    await writeChunk(gzip, ',"files":{')
    let firstDirectory = true
    for (const [key, dirPath] of Object.entries(UPLOAD_DIRECTORIES)) {
      if (!firstDirectory) await writeChunk(gzip, ',')
      firstDirectory = false
      await writeChunk(gzip, `${serializeBackupValue(key)}:[`)

      if (includeFiles) {
        let firstFile = true
        await walkDirectoryFiles(dirPath, async (absolutePath, baseDir) => {
          try {
            const relativePath = path.relative(baseDir, absolutePath).split(path.sep).join('/')
            const content = fs.readFileSync(absolutePath)
            const stat = fs.statSync(absolutePath)
            const entry = serializeBackupValue({
              path: relativePath,
              size: stat.size,
              contentBase64: content.toString('base64'),
            })

            if (!firstFile) await writeChunk(gzip, ',')
            firstFile = false
            await writeChunk(gzip, entry)
          } catch (err) {
            logger.warn('Skipping unreadable file while creating backup', {
              file: absolutePath,
              message: err.message,
            })
          }
        })
      }

      await writeChunk(gzip, ']')
    }
    await writeChunk(gzip, '}}')
    gzip.end()
    await finished(fileStream)
  } catch (err) {
    gzip.destroy(err)
    fileStream.destroy(err)
    throw err
  }

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

function removeTempUpload(filepath) {
  if (!filepath) return
  try {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
  } catch (err) {
    logger.warn('Could not remove temporary restore upload', { filepath, message: err.message })
  }
}

const createBackup = async (req, res, next) => {
  try {
    ensureRuntimeDirectories()
    const includeFiles = req.body?.includeFiles !== false && req.body?.includeFiles !== 'false'
    const data = await collectAllData()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.json.gz`
    const filepath = path.join(BACKUP_DIR, filename)

    const { counts, fileCounts, size } = await writeBackupFile(filepath, data, {
      createdBy: req.user.email,
    }, { includeFiles })

    logger.info('Backup created', { filename, bytes: size, by: req.user.email, includeFiles, fileCounts })

    res.status(201).json({
      message: includeFiles ? 'Full backup created successfully' : 'Data-only backup created successfully',
      filename,
      size,
      includesFiles: includeFiles,
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
    ensureRuntimeDirectories()
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
    ensureRuntimeDirectories()
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
    ensureRuntimeDirectories()
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
    ensureRuntimeDirectories()
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
      await runRestoreStep('notification.deleteMany', () => tx.notification.deleteMany())
      await runRestoreStep('activityLog.deleteMany', () => tx.activityLog.deleteMany())
      await runRestoreStep('communicationLog.deleteMany', () => tx.communicationLog.deleteMany(), true)
      await runRestoreStep('emailJob.deleteMany', () => tx.emailJob.deleteMany(), true)
      await runRestoreStep('appeal.deleteMany', () => tx.appeal.deleteMany(), true)
      await runRestoreStep('examSchedule.deleteMany', () => tx.examSchedule.deleteMany())
      await runRestoreStep('renewalFile.deleteMany', () => tx.renewalFile.deleteMany(), true)
      await runRestoreStep('scholarshipRenewal.deleteMany', () => tx.scholarshipRenewal.deleteMany(), true)
      await runRestoreStep('corFile.deleteMany', () => tx.corFile.deleteMany())
      await runRestoreStep('requirementFile.deleteMany', () => tx.requirementFile.deleteMany())
      await runRestoreStep('application.deleteMany', () => tx.application.deleteMany())
      await runRestoreStep('carouselSlide.deleteMany', () => tx.carouselSlide.deleteMany(), true)
      await runRestoreStep('siteSetting.deleteMany', () => tx.siteSetting.deleteMany(), true)
      await runRestoreStep('user.deleteMany', () => tx.user.deleteMany())

      if (data.users?.length) await runRestoreStep('user.createMany', () => tx.user.createMany({ data: data.users }))
      if (data.applications?.length) await runRestoreStep('application.createMany', () => tx.application.createMany({ data: data.applications }))
      if (data.requirementFiles?.length) await runRestoreStep('requirementFile.createMany', () => tx.requirementFile.createMany({ data: data.requirementFiles }))
      if (data.corFiles?.length) await runRestoreStep('corFile.createMany', () => tx.corFile.createMany({ data: data.corFiles }))
      if (data.scholarshipRenewals?.length) await runRestoreStep('scholarshipRenewal.createMany', () => tx.scholarshipRenewal.createMany({ data: data.scholarshipRenewals }), true)
      if (data.renewalFiles?.length) await runRestoreStep('renewalFile.createMany', () => tx.renewalFile.createMany({ data: data.renewalFiles }), true)
      if (data.examSchedules?.length) await runRestoreStep('examSchedule.createMany', () => tx.examSchedule.createMany({ data: data.examSchedules }))
      if (data.appeals?.length) await runRestoreStep('appeal.createMany', () => tx.appeal.createMany({ data: data.appeals }), true)
      if (data.activityLogs?.length) await runRestoreStep('activityLog.createMany', () => tx.activityLog.createMany({ data: data.activityLogs }))
      if (data.communicationLogs?.length) await runRestoreStep('communicationLog.createMany', () => tx.communicationLog.createMany({ data: data.communicationLogs }), true)
      if (data.emailJobs?.length) await runRestoreStep('emailJob.createMany', () => tx.emailJob.createMany({ data: data.emailJobs }), true)
      if (data.notifications?.length) await runRestoreStep('notification.createMany', () => tx.notification.createMany({ data: data.notifications }))
      if (data.carouselSlides?.length) await runRestoreStep('carouselSlide.createMany', () => tx.carouselSlide.createMany({ data: data.carouselSlides }), true)
      if (data.siteSettings?.length) await runRestoreStep('siteSetting.createMany', () => tx.siteSetting.createMany({ data: data.siteSettings }), true)
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
  try {
    const buffer = fs.readFileSync(req.file.path)
    return runRestoreFromBuffer(buffer, req.file.originalname, req.user.email, res, next)
  } catch (err) {
    return next(err)
  } finally {
    removeTempUpload(req.file.path)
  }
}

const restoreBackupFromServer = (req, res, next) => {
  ensureRuntimeDirectories()
  const { filename } = req.params
  if (!FILENAME_RE.test(filename)) return next(new AppError('Invalid backup filename', 400))
  const filepath = path.join(BACKUP_DIR, filename)
  if (!fs.existsSync(filepath)) return next(new AppError('Backup file not found', 404))
  const buffer = fs.readFileSync(filepath)
  return runRestoreFromBuffer(buffer, filename, req.user.email, res, next)
}

module.exports = { createBackup, listBackups, downloadBackup, deleteBackup, restoreBackup, restoreBackupFromServer, upload }
