const { ok } = require('../../utils/http');
const service = require('./notifications.service');

module.exports = {
  list: async (req, res) => {
    const { items, meta } = await service.list(req.user.id, req.query);
    return ok(res, items, meta);
  },
  unreadCount: async (req, res) => ok(res, await service.unreadCount(req.user.id)),
  markRead: async (req, res) => ok(res, await service.markRead(req.user.id, req.params.id)),
  markAllRead: async (req, res) => ok(res, await service.markAllRead(req.user.id)),
  broadcast: async (req, res) => ok(res, await service.broadcast(req.user, req.body)),
};
