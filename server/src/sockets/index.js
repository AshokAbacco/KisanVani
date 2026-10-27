const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');
const logger = require('../config/logger');
const { setIO, userRoom } = require('./io');
const registerTrackingHandlers = require('./tracking.socket');

/**
 * Socket.IO server. Every connection must present a valid access token; the user is re-loaded
 * from the database so suspended accounts cannot keep a live connection.
 */
const initSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: config.clientUrls, credentials: true },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = jwt.verify(token, config.jwt.accessSecret, { issuer: 'kisanvani', audience: 'kisanvani-app' });
      const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, status: true, name: true } });
      if (!user || user.status !== 'ACTIVE') return next(new Error('UNAUTHORIZED'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    socket.join(userRoom(user.id));
    if (user.role === 'ADMIN') socket.join('admins');
    registerTrackingHandlers(io, socket);
    socket.on('error', (err) => logger.warn(`Socket error for ${user.id}: ${err.message}`));
  });

  setIO(io);
  return io;
};

module.exports = { initSockets };
