const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { notify } = require('../../services/notification.service');
const { paginate, pageMeta } = require('../../utils/pagination');

const INCLUDE = {
  documents: { orderBy: { createdAt: 'desc' } },
  driver: { select: { id: true, name: true, mobile: true } },
  _count: { select: { trips: true } },
};

/** Fields whose change requires the vehicle to be re-verified by an admin. */
const VERIFIED_FIELDS = ['registrationNumber', 'type', 'capacityKg', 'ownerName'];

const get = async (user, id) => {
  const v = await prisma.vehicle.findUnique({ where: { id }, include: INCLUDE });
  if (!v || (user.role !== 'ADMIN' && v.driverId !== user.id)) throw ApiError.notFound('Vehicle not found');
  return v;
};

const list = async (user, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['createdAt', 'registrationNumber', 'capacityKg'], 'createdAt');
  const where = {
    ...(user.role === 'ADMIN' ? (query.driverId ? { driverId: query.driverId } : {}) : { driverId: user.id }),
    ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(q.search
      ? { OR: [{ registrationNumber: { contains: q.search.replace(/\s/g, ''), mode: 'insensitive' } }, { ownerName: { contains: q.search, mode: 'insensitive' } }, { driver: { name: { contains: q.search, mode: 'insensitive' } } }] }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.vehicle.findMany({ where, skip, take, orderBy, include: INCLUDE }),
    prisma.vehicle.count({ where }),
  ]);
  return { items, meta: pageMeta(q, total) };
};

const create = async (user, data) => {
  const v = await prisma.vehicle.create({ data: { ...data, driverId: user.id }, include: INCLUDE });
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
  for (const a of admins) {
    await notify(a.id, { type: 'VEHICLE_VERIFICATION', title: 'Vehicle awaiting verification', message: `${user.name} registered ${v.registrationNumber}`, link: `/admin/vehicles/${v.id}` });
  }
  return v;
};

const update = async (user, id, data) => {
  const v = await get(user, id);
  if (user.role !== 'ADMIN' && v.driverId !== user.id) throw ApiError.forbidden();
  const needsReverify = v.verificationStatus === 'VERIFIED' && VERIFIED_FIELDS.some((f) => data[f] !== undefined && String(data[f]) !== String(v[f]));
  const updated = await prisma.vehicle.update({
    where: { id },
    data: { ...data, ...(needsReverify ? { verificationStatus: 'PENDING', verificationNote: 'Details changed — re-verification required' } : {}) },
    include: INCLUDE,
  });
  return updated;
};

const EXPIRY_FIELD = { INSURANCE: 'insuranceExpiry', FITNESS: 'fitnessExpiry', PERMIT: 'permitExpiry' };

const addDocument = async (user, id, body, fileUrl) => {
  const v = await get(user, id);
  if (v.driverId !== user.id) throw ApiError.forbidden('Only the vehicle driver can upload documents');
  await prisma.$transaction(async (tx) => {
    await tx.vehicleDocument.create({ data: { vehicleId: id, type: body.type, documentNumber: body.documentNumber, expiryDate: body.expiryDate || null, fileUrl } });
    const field = EXPIRY_FIELD[body.type];
    const patch = {};
    if (field && body.expiryDate) patch[field] = body.expiryDate;
    if (body.type === 'INSURANCE' && body.documentNumber) patch.insurancePolicyNo = body.documentNumber;
    if (body.type === 'PERMIT' && body.documentNumber) patch.permitNumber = body.documentNumber;
    if (Object.keys(patch).length) await tx.vehicle.update({ where: { id }, data: patch });
  });
  return get(user, id);
};

const removeDocument = async (user, id, docId) => {
  const v = await get(user, id);
  if (v.driverId !== user.id) throw ApiError.forbidden();
  const doc = v.documents.find((d) => d.id === docId);
  if (!doc) throw ApiError.notFound('Document not found');
  if (doc.verificationStatus === 'VERIFIED') throw ApiError.conflict('Verified documents cannot be removed; upload a newer document instead');
  await prisma.vehicleDocument.delete({ where: { id: docId } });
  return get(user, id);
};

const verify = async (admin, id, { status, note }) => {
  const v = await prisma.vehicle.findUnique({ where: { id } });
  if (!v) throw ApiError.notFound('Vehicle not found');
  await prisma.$transaction(async (tx) => {
    await tx.vehicle.update({ where: { id }, data: { verificationStatus: status, verificationNote: note } });
    if (status === 'VERIFIED') await tx.vehicleDocument.updateMany({ where: { vehicleId: id, verificationStatus: 'PENDING' }, data: { verificationStatus: 'VERIFIED' } });
  });
  await notify(v.driverId, {
    type: 'VEHICLE_VERIFICATION',
    title: status === 'VERIFIED' ? 'Vehicle verified' : 'Vehicle verification rejected',
    message: status === 'VERIFIED' ? `${v.registrationNumber} is verified and can take trips.` : `${v.registrationNumber}: ${note}`,
    link: `/driver/vehicles/${id}`,
  });
  return get(admin, id);
};

const verifyDocument = async (admin, id, docId, { status }) => {
  const doc = await prisma.vehicleDocument.findFirst({ where: { id: docId, vehicleId: id } });
  if (!doc) throw ApiError.notFound('Document not found');
  await prisma.vehicleDocument.update({ where: { id: docId }, data: { verificationStatus: status } });
  return get(admin, id);
};

module.exports = { list, get, create, update, addDocument, removeDocument, verify, verifyDocument };
