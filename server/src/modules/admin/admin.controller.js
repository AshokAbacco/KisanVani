const { ok, created } = require('../../utils/http');
const service = require('./admin.service');

const paged = (fn) => async (req, res) => {
  const { items, meta } = await fn(req);
  return ok(res, items, meta);
};

module.exports = {
  dashboard: async (req, res) => ok(res, await service.dashboard(req.query)),
  listUsers: paged((req) => service.listUsers(req.query)),
  getUser: async (req, res) => ok(res, await service.getUser(req.params.id)),
  createUser: async (req, res) => created(res, await service.createUser(req.user, req.body, req.ip)),
  updateUser: async (req, res) => ok(res, await service.updateUser(req.user, req.params.id, req.body, req.ip)),
  setStatus: async (req, res) => ok(res, await service.setStatus(req.user, req.params.id, req.body, req.ip)),
  revokeSessions: async (req, res) => ok(res, await service.revokeSessions(req.user, req.params.id, req.ip)),
  auditLogs: paged((req) => service.auditLogs(req.query)),
};
