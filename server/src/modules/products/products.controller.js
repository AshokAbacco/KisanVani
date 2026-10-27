const { ok, created } = require('../../utils/http');
const ApiError = require('../../utils/ApiError');
const { saveFiles } = require('../../services/storage.service');
const service = require('./products.service');

const list = async (req, res) => {
  const { items, meta } = await service.list(req.query, req.user.role === 'ADMIN');
  return ok(res, items, meta);
};
const get = async (req, res) => ok(res, await service.get(req.params.id));
const create = async (req, res) => created(res, await service.create(req.user, req.body));
const update = async (req, res) => ok(res, await service.update(req.user, req.params.id, req.body));
const uploadImage = async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');
  const [url] = await saveFiles([req.file], 'products');
  return ok(res, await service.setImage(req.user, req.params.id, url));
};

module.exports = { list, get, create, update, uploadImage };
