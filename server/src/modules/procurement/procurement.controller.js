const { ok, created } = require('../../utils/http');
const service = require('./procurement.service');

const paged = (fn) => async (req, res) => {
  const { items, meta } = await fn(req);
  return ok(res, items, meta);
};

module.exports = {
  harvestListings: paged((req) => service.harvestListings(req.user, req.query)),
  harvestListing: async (req, res) => ok(res, await service.harvestListing(req.params.id)),
  mandiLots: paged((req) => service.mandiLots(req.user, req.query)),
  mandiLot: async (req, res) => ok(res, await service.mandiLot(req.params.id)),
  listPurchases: paged((req) => service.listPurchases(req.user.id, req.query)),
  getPurchase: async (req, res) => ok(res, await service.getPurchase(req.user.id, req.params.id)),
  createPurchase: async (req, res) => created(res, await service.createPurchase(req.user, req.body)),
  receivePurchase: async (req, res) => ok(res, await service.receivePurchase(req.user, req.params.id, req.body)),
  cancelPurchase: async (req, res) => ok(res, await service.cancelPurchase(req.user, req.params.id, req.body.reason)),
  payPurchase: async (req, res) => created(res, await service.payPurchase(req.user, req.params.id, req.body)),
};
