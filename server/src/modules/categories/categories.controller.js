const { ok, created } = require('../../utils/http');
const service = require('./categories.service');

const list = async (req, res) => ok(res, await service.list(req.query, req.user.role === 'ADMIN'));
const create = async (req, res) => created(res, await service.create(req.user, req.body));
const update = async (req, res) => ok(res, await service.update(req.user, req.params.id, req.body));
const remove = async (req, res) => ok(res, await service.remove(req.user, req.params.id));

module.exports = { list, create, update, remove };
