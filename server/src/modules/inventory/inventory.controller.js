const { ok, created } = require('../../utils/http');
const service = require('./inventory.service');

const list = async (req, res) => {
  const { items, meta } = await service.list(req.user.id, req.query);
  return ok(res, items, meta);
};
const get = async (req, res) => ok(res, await service.getOwned(req.user.id, req.params.id));
const create = async (req, res) => created(res, await service.create(req.user, req.body));
const update = async (req, res) => ok(res, await service.update(req.user, req.params.id, req.body));
const adjust = async (req, res) => ok(res, await service.adjust(req.user, req.params.id, req.body));
const transactions = async (req, res) => {
  const { items, meta } = await service.transactions(req.user.id, req.query);
  return ok(res, items, meta);
};

module.exports = { list, get, create, update, adjust, transactions };
