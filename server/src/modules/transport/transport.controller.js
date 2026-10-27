const { ok, created } = require('../../utils/http');
const { saveFiles } = require('../../services/storage.service');
const v = require('./transport.validation');
const service = require('./transport.service');

const paged = (fn) => async (req, res) => {
  const { items, meta } = await fn(req);
  return ok(res, items, meta);
};

module.exports = {
  createRequest: async (req, res) => created(res, await service.createRequest(req.user, req.body)),
  listRequests: paged((req) => service.listRequests(req.user, req.query)),
  getRequest: async (req, res) => ok(res, await service.getRequest(req.user, req.params.id)),
  cancelRequest: async (req, res) => ok(res, await service.cancelRequest(req.user, req.params.id, req.body.reason)),
  claimRequest: async (req, res) => created(res, await service.claimRequest(req.user, req.params.id, req.body)),
  assignTrip: async (req, res) => created(res, await service.assignTrip(req.user, req.body)),
  listTrips: paged((req) => service.listTrips(req.user, req.query)),
  getTrip: async (req, res) => ok(res, await service.getTrip(req.user, req.params.id)),
  transitionTrip: async (req, res) => ok(res, await service.transitionTrip(req.user, req.params.id, req.body)),
  addProof: async (req, res) => {
    const body = v.proofBody.parse(req.body);
    const [url] = req.file ? await saveFiles([req.file], 'delivery-proofs') : [null];
    return ok(res, await service.addProof(req.user, req.params.id, body, url));
  },
  availableDrivers: async (req, res) => ok(res, await service.availableDrivers(req.query)),
};
