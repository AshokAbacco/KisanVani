const { ok, created } = require('../../utils/http');
const service = require('./chat.service');

module.exports = {
  contacts: async (req, res) => ok(res, await service.contacts(req.user, req.query)),
  conversations: async (req, res) => ok(res, await service.listConversations(req.user)),
  unreadCount: async (req, res) => ok(res, await service.unreadTotal(req.user.id)),
  open: async (req, res) => ok(res, await service.openConversation(req.user, req.body.userId)),
  getConversation: async (req, res) => ok(res, await service.getConversation(req.user, req.params.id)),
  messages: async (req, res) => {
    const { items, hasMore } = await service.listMessages(req.user, req.params.id, req.query);
    return ok(res, items, { hasMore });
  },
  send: async (req, res) => created(res, await service.sendMessage(req.user, req.params.id, req.body)),
  edit: async (req, res) => ok(res, await service.editMessage(req.user, req.params.id, req.body)),
  read: async (req, res) => ok(res, await service.markRead(req.user, req.params.id)),
  clear: async (req, res) => ok(res, await service.clearConversation(req.user, req.params.id)),
  remove: async (req, res) => ok(res, await service.deleteConversation(req.user, req.params.id)),
};
