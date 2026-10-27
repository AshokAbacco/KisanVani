const { ok } = require('../../utils/http');
const config = require('../../config');
const service = require('./settings.service');

const publicSettings = async (_req, res) =>
  ok(res, {
    ...(await service.getPublic()),
    'tracking.minIntervalSec': config.tracking.minIntervalSec,
    'email.enabled': config.smtp.enabled,
  });

const list = async (_req, res) => ok(res, await service.listAll());

const update = async (req, res) => ok(res, await service.update(req.user, req.params.key, req.body.value, req.ip));

module.exports = { publicSettings, list, update };
