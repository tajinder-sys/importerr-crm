const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { uploadsRoot } = require('../utils/brandingSettings');

fs.mkdirSync(uploadsRoot, { recursive: true });

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const ALLOWED_MIME = /^image\/(png|jpeg|jpg|webp|svg\+xml)$/;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.png';
    cb(null, `logo-${Date.now()}${safeExt}`);
  },
});

const uploadBrandingLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.test(file.mimetype)) {
      return cb(new Error('Only PNG, JPG, WEBP or SVG images are allowed'));
    }
    cb(null, true);
  },
}).single('logo');

module.exports = { uploadBrandingLogo };
