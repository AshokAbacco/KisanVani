const { ok } = require('../../utils/http');
const service = require('./orders.service');

module.exports = {
  create: async (req, res) => {
    const { order, duplicate } = await service.createOrder(req.user, req.body);
    return res.status(duplicate ? 200 : 201).json({ success: true, data: order, meta: { duplicate } });
  },
  list: async (req, res) => {
    const { items, meta } = await service.listOrders(req.user, req.query);
    return ok(res, items, meta);
  },
  get: async (req, res) => ok(res, await service.getOrder(req.user, req.params.id)),
  transition: async (req, res) => ok(res, await service.transition(req.user, req.params.id, req.body)),
  receive: async (req, res) => ok(res, await service.receive(req.user, req.params.id, req.body)),
};
