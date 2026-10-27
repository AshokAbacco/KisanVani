const { ok, created } = require('../../utils/http');
const ApiError = require('../../utils/ApiError');
const { saveFiles } = require('../../services/storage.service');
const service = require('./mandi.service');

module.exports = {
  dashboard: async (req, res) => ok(res, await service.dashboard(req.user.id)),
  products: async (req, res) => ok(res, await service.products(req.user.id)),
  partners: async (req, res) => ok(res, await service.partners(req.user.id)),
  list: async (req, res) => {
    const { items, meta } = await service.list(req.user.id, req.query);
    return ok(res, items, meta);
  },
  get: async (req, res) => ok(res, await service.getOwned(req.user.id, req.params.id)),
  create: async (req, res) => created(res, await service.create(req.user, req.body)),
  update: async (req, res) => ok(res, await service.update(req.user, req.params.id, req.body)),
  setStatus: async (req, res) => ok(res, await service.setStatus(req.user, req.params.id, req.body.status)),
  addImages: async (req, res) => {
    if (!req.files?.length) throw ApiError.badRequest('Choose at least one photo');
    const urls = await saveFiles(req.files, 'lots');
    return ok(res, await service.addImages(req.user, req.params.id, urls));
  },
  removeImage: async (req, res) => ok(res, await service.removeImage(req.user, req.params.id, req.body.url)),
  setCommission: async (req, res) => ok(res, await service.setCommission(req.user, req.body.commissionPercent)),
};
