const multer = require('multer');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOC_TYPES = [...IMAGE_TYPES, 'application/pdf'];

// Files are buffered in memory, checked, then handed to the storage service (local disk or S3).
const build = (allowed) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.storage.maxBytes, files: 6 },
    fileFilter: (_req, file, cb) => {
      if (!allowed.includes(file.mimetype)) {
        return cb(ApiError.badRequest(`Unsupported file type. Allowed: ${allowed.join(', ')}`));
      }
      cb(null, true);
    },
  });

module.exports = {
  imageUpload: build(IMAGE_TYPES),
  documentUpload: build(DOC_TYPES),
  IMAGE_TYPES,
  DOC_TYPES,
};
