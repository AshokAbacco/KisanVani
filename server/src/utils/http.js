/** Wraps async route handlers so rejected promises reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Consistent success envelope: { success: true, data, meta? } */
const ok = (res, data, meta, status = 200) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

const created = (res, data) => ok(res, data, undefined, 201);

module.exports = { asyncHandler, ok, created };
