const multer = require('multer');
const path = require('path');
const fs = require('fs');

const privateUploadsDir = path.join(__dirname, '../../private_uploads');
const publicUploadsDir = path.join(__dirname, '../../public_uploads');
if (!fs.existsSync(privateUploadsDir)) {
  fs.mkdirSync(privateUploadsDir, { recursive: true });
}
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}

const privateStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, privateUploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const publicStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, publicUploadsDir),
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
  storage: privateStorage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

const uploadCOR = multer({
  storage: privateStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed for COR'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadImage = multer({
  storage: publicStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WebP images are allowed'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { upload, uploadCOR, uploadImage };
