const prisma = require('../config/prisma');
const logger = require('../config/logger');

/**
 * Records an audit entry. Pass a transaction client to make the entry atomic with the change itself.
 * @param {{ actorId?: string, action: string, entityType: string, entityId?: string, metadata?: object, ip?: string }} entry
 */
const record = async (entry, client = prisma) => {
  try {
    await client.auditLog.create({
      data: {
        actorId: entry.actorId || null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId || null,
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined,
        ipAddress: entry.ip || null,
      },
    });
  } catch (err) {
    // Inside a transaction we must propagate so the whole change rolls back.
    if (client !== prisma) throw err;
    logger.error('Failed to write audit log', { err: err.message, entry });
  }
};

module.exports = { record };
