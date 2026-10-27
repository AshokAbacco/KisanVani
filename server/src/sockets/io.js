// Holds the Socket.IO server instance so services can emit without circular imports.
let io = null;

const setIO = (instance) => {
  io = instance;
};

const getIO = () => io;

/** Emit to a room if the socket server is running (no-op in tests or scripts). */
const emitTo = (room, event, payload) => {
  if (io) io.to(room).emit(event, payload);
};

const userRoom = (userId) => `user:${userId}`;
const tripRoom = (tripId) => `trip:${tripId}`;

module.exports = { setIO, getIO, emitTo, userRoom, tripRoom };
