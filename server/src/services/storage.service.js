const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const config = require('../config');
const logger = require('../config/logger');

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };

// Magic-byte check so a renamed executable cannot pass as an image or PDF.
const SIGNATURES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP',
  'application/pdf': (b) => b.slice(0, 5).toString() === '%PDF-',
};

const verifySignature = (file) => {
  const check = SIGNATURES[file.mimetype];
  return Boolean(check && file.buffer && file.buffer.length > 12 && check(file.buffer));
};

const uploadRoot = path.resolve(__dirname, '..', '..', config.storage.uploadDir);

const localAdapter = {
  async save(file, folder) {
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${EXT[file.mimetype] || ''}`;
    const dir = path.join(uploadRoot, folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), file.buffer);
    return `${config.publicServerUrl}/uploads/${folder}/${name}`;
  },
};

let s3Client = null;
const s3Adapter = {
  async save(file, folder) {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = config.storage.s3;
    if (!s3.bucket || !s3.accessKeyId || !s3.secretAccessKey) {
      throw new Error('S3 storage is selected but S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are not configured');
    }
    if (!s3Client) {
      s3Client = new S3Client({
        region: s3.region,
        endpoint: s3.endpoint || undefined,
        forcePathStyle: Boolean(s3.endpoint),
        credentials: { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey },
      });
    }
    const key = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${EXT[file.mimetype] || ''}`;
    await s3Client.send(new PutObjectCommand({ Bucket: s3.bucket, Key: key, Body: file.buffer, ContentType: file.mimetype }));
    const base = s3.publicBaseUrl || `https://${s3.bucket}.s3.${s3.region}.amazonaws.com`;
    return `${base.replace(/\/$/, '')}/${key}`;
  },
};

const adapter = config.storage.driver === 's3' ? s3Adapter : localAdapter;

/**
 * Saves uploaded files and returns their public URLs.
 * @param {Express.Multer.File[]} files
 * @param {string} folder - e.g. "listings", "vehicle-docs", "delivery-proofs"
 */
const saveFiles = async (files = [], folder) => {
  const ApiError = require('../utils/ApiError');
  for (const f of files) {
    if (!verifySignature(f)) throw ApiError.badRequest(`File "${f.originalname}" content does not match its type`);
  }
  try {
    return await Promise.all(files.map((f) => adapter.save(f, folder)));
  } catch (err) {
    logger.error('File storage failed', { err: err.message });
    throw new ApiError(502, 'Could not store the uploaded file', 'STORAGE_ERROR');
  }
};

module.exports = { saveFiles, uploadRoot };
