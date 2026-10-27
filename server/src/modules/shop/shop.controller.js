const { ok } = require('../../utils/http');
const service = require('./shop.service');

module.exports = {
  dashboard: async (req, res) => ok(res, await service.dashboard(req.user.id)),
};
