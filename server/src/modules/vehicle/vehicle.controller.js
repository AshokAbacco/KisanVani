const { ok, created } = require('../../utils/http');
const ApiError = require('../../utils/ApiError');
const { saveFiles } = require('../../services/storage.service');
const v = require('./vehicle.validation');
const service = require('./vehicle.service');

module.exports = {
  list: async (req, res) => {
    const { items, meta } = await service.list(req.user, req.query);
    return ok(res, items, meta);
  },
  get: async (req, res) => ok(res, await service.get(req.user, req.params.id)),
  create: async (req, res) => created(res, await service.create(req.user, req.body)),
  update: async (req, res) => ok(res, await service.update(req.user, req.params.id, req.body)),
  addDocument: async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Attach the document (image or PDF)');
    // Multipart fields arrive as strings; validate after multer has parsed them.
    const body = v.documentBody.parse(req.body);
    const [url] = await saveFiles([req.file], 'vehicle-docs');
    return created(res, await service.addDocument(req.user, req.params.id, body, url));
  },
  removeDocument: async (req, res) => ok(res, await service.removeDocument(req.user, req.params.id, req.params.docId)),
  verify: async (req, res) => ok(res, await service.verify(req.user, req.params.id, req.body)),
  verifyDocument: async (req, res) => ok(res, await service.verifyDocument(req.user, req.params.id, req.params.docId, req.body)),
};
