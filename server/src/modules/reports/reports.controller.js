const { ok } = require('../../utils/http');
const { toCsv, sendCsv } = require('../../utils/csv');
const service = require('./reports.service');

module.exports = {
  summary: async (req, res) => ok(res, await service.summary(req.user, req.query)),
  export: async (req, res) => {
    const { rows, columns } = await service.exportDataset(req.user, req.query);
    const date = new Date().toISOString().slice(0, 10);
    return sendCsv(res, `kisanvani-${req.query.dataset}-${date}.csv`, toCsv(rows, columns));
  },
};
