const { ZodError } = require('zod');
const { Prisma } = require('../generated/prisma/client.ts');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const config = require('../config');

const notFound = (req, _res, next) => next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));

const errorHandler = (err, req, res, _next) => {
  let error = err;

  if (err instanceof ZodError) {
    error = new ApiError(
      422,
      'Validation failed',
      'VALIDATION_ERROR',
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    );
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = err.meta?.target || err.meta?.driverAdapterError?.cause?.constraint?.fields;
      error = ApiError.conflict(`A record with this ${[].concat(target || 'value').join(', ')} already exists`);
    } else if (err.code === 'P2025') {
      error = ApiError.notFound('Record not found');
    } else if (err.code === 'P2003') {
      error = ApiError.badRequest('Related record does not exist or is still in use');
    } else {
      error = new ApiError(500, 'Database error', 'DATABASE_ERROR');
    }
  } else if (err instanceof multer.MulterError) {
    error = ApiError.badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message);
  } else if (err?.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body');
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(500, 'Something went wrong', 'INTERNAL_ERROR');
  }

  if (error.statusCode >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl, method: req.method });
  }

  const body = { success: false, error: { code: error.code, message: error.message } };
  if (error.details) body.error.details = error.details;
  if (!config.isProd && error.statusCode >= 500) body.error.debug = err.message;

  res.status(error.statusCode).json(body);
};

module.exports = { notFound, errorHandler };