const { ok } = require('../../utils/http');
const service = require('./calls.service');

module.exports = {
  iceServers: async (req, res) => {
    res.set('Cache-Control', 'no-store'); // contains short-lived TURN credentials
    return ok(res, await service.iceServers(req.user));
  },
  history: async (req, res) => ok(res, await service.history(req.user, req.query)),
};