const { ok } = require('../../utils/http');
const { toCsv, sendCsv } = require('../../utils/csv');
const audit = require('../../services/audit.service');
const service = require('./reports.service');

module.exports = {
  summary: async (req, res) => ok(res, await service.summary(req.user, req.query)),
  export: async (req, res) => {
    const { rows, columns } = await service.exportDataset(req.user, req.query);
    if (req.user.role === 'ADMIN') {
      await audit.record({ actorId: req.user.id, action: 'REPORT_EXPORTED', entityType: 'Report', entityId: req.query.dataset, metadata: { rows: rows.length, from: req.query.from, to: req.query.to }, ip: req.ip });
    }
    const date = new Date().toISOString().slice(0, 10);
    return sendCsv(res, `kisanvani-${req.query.dataset}-${date}.csv`, toCsv(rows, columns));
  },
};
