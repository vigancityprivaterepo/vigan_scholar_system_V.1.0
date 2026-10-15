const path = require('path');

// Uploads are only ever these types. Both the extension a file is stored with and the
// Content-Type it is served with come from these lists, never from the uploaded file
// name or the type the browser claims, so an upload can't become a page or a script.
const EXTENSION_FOR_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const SERVE_TYPE_FOR_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

const extensionForMime = (mime) => EXTENSION_FOR_MIME[mime] || null;

const serveTypeForPath = (filePath) => SERVE_TYPE_FOR_EXTENSION[path.extname(String(filePath)).toLowerCase()] || null;

module.exports = { extensionForMime, serveTypeForPath };
