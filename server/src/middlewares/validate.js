/**
 * Validates and replaces req.body / req.query / req.params with parsed Zod output.
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 */
const validate = (schemas) => (req, _res, next) => {
  try {
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) {
      const parsed = schemas.query.parse(req.query);
      // Express 4 exposes req.query as a getter-backed object; overwrite safely.
      Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
    }
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validate;
