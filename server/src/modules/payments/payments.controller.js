const { ok, created } = require('../../utils/http');
const service = require('./payments.service');

module.exports = {
  list: async (req, res) => {
    const { items, meta } = await service.list(req.user, req.query);
    return ok(res, items, meta);
  },
  summary: async (req, res) => ok(res, await service.summary(req.user)),
  payOrder: async (req, res) => created(res, await service.payOrder(req.user, req.params.orderId, req.body)),
  payTrip: async (req, res) => created(res, await service.payTrip(req.user, req.params.tripId, req.body)),
};
