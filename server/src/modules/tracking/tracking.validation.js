const { z, latitude, longitude, idParam } = require('../../validators/common');

const locationBody = z.object({
  latitude,
  longitude,
  accuracy: z.coerce.number().min(0).max(100000).optional().nullable(),
  speed: z.coerce.number().min(0).max(100).optional().nullable(),
  heading: z.coerce.number().min(0).max(360).optional().nullable(),
  recordedAt: z.coerce.date().optional(),
});

const socketLocation = locationBody.extend({ tripId: z.string().uuid() });

const locationsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(300),
  since: z.coerce.date().optional(),
});

module.exports = { locationBody, socketLocation, locationsQuery, idParam };
