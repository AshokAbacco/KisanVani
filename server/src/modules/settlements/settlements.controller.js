const { ok } = require('../../utils/http');
const service = require('./settlements.service');

module.exports = {
  list: async (req, res) => {
    const { items, meta } = await service.list(req.user, req.query);
    return ok(res, items, meta);
  },
  get: async (req, res) => ok(res, await service.get(req.user, req.params.id)),
};
