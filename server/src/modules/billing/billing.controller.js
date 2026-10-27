const { ok } = require('../../utils/http');
const service = require('./billing.service');

const createInvoice = async (req, res) => {
  const { invoice, duplicate } = await service.createInvoice(req.user, req.body);
  // 201 for a new bill, 200 when an identical submission was already processed.
  return res.status(duplicate ? 200 : 201).json({ success: true, data: invoice, meta: { duplicate } });
};
const list = async (req, res) => {
  const { items, meta } = await service.listInvoices(req.user, req.query);
  return ok(res, items, meta);
};
const get = async (req, res) => ok(res, await service.getInvoice(req.user, req.params.id));
const print = async (req, res) => ok(res, await service.printInvoice(req.user, req.params.id));
const cancel = async (req, res) => ok(res, await service.cancelInvoice(req.user, req.params.id, req.body.reason));
const posConfig = async (req, res) => ok(res, await service.posConfig(req.user));

module.exports = { createInvoice, list, get, print, cancel, posConfig };
