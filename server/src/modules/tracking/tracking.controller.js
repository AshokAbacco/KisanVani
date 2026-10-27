const { ok, created } = require('../../utils/http');
const service = require('./tracking.service');

const postLocation = async (req, res) => {
  const point = await service.recordLocation(req.user, { ...req.body, tripId: req.params.id });
  return created(res, point);
};

const getLocations = async (req, res) => ok(res, await service.getLocations(req.user, req.params.id, req.query));

const active = async (req, res) => ok(res, await service.activeTrips(req.user));

module.exports = { postLocation, getLocations, active };
