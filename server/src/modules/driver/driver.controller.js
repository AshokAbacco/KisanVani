const { ok } = require('../../utils/http');
const service = require('./driver.service');

module.exports = {
  dashboard: async (req, res) => ok(res, await service.dashboard(req.user.id)),
  earnings: async (req, res) => ok(res, await service.earnings(req.user.id)),
};
