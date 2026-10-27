const { ok, created } = require('../../utils/http');
const service = require('./customers.service');

const list = async (req, res) => {
  const { items, meta } = await service.list(req.user.id, req.query);
  return ok(res, items, meta);
};
const get = async (req, res) => ok(res, await service.get(req.user.id, req.params.id));
const create = async (req, res) => created(res, await service.create(req.user.id, req.body));
const update = async (req, res) => ok(res, await service.update(req.user.id, req.params.id, req.body));
const collect = async (req, res) => created(res, await service.collect(req.user, req.params.id, req.body));

module.exports = { list, get, create, update, collect };
