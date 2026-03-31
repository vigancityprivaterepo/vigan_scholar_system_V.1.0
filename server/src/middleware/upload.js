const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
};

const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '5');

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

const uploadCOR = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed for COR'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadImage = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WebP images are allowed'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { upload, uploadCOR, uploadImage };
