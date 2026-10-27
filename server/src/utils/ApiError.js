class ApiError extends Error {
  constructor(statusCode, message, code = undefined, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || ApiError.defaultCode(statusCode);
    this.details = details;
    this.isOperational = true;
  }

  static defaultCode(status) {
    return (
      {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'UNPROCESSABLE',
        429: 'TOO_MANY_REQUESTS',
      }[status] || 'INTERNAL_ERROR'
    );
  }

  static badRequest(msg, details) {
    return new ApiError(400, msg, 'BAD_REQUEST', details);
  }
  static unauthorized(msg = 'Authentication required') {
    return new ApiError(401, msg, 'UNAUTHORIZED');
  }
  static forbidden(msg = 'You do not have permission to perform this action') {
    return new ApiError(403, msg, 'FORBIDDEN');
  }
  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg, 'NOT_FOUND');
  }
  static conflict(msg, details) {
    return new ApiError(409, msg, 'CONFLICT', details);
  }
  static unprocessable(msg, details) {
    return new ApiError(422, msg, 'UNPROCESSABLE', details);
  }
}

module.exports = ApiError;
