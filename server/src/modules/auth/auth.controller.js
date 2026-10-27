const config = require('../../config');
const { ok, created } = require('../../utils/http');
const ApiError = require('../../utils/ApiError');
const { saveFiles } = require('../../services/storage.service');
const service = require('./auth.service');

const COOKIE = 'kv_rt';
const cookieOptions = () => ({
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: config.cookieSameSite,
  path: '/api/v1/auth',
  maxAge: config.jwt.refreshTtlDays * 86_400_000,
});

const meta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

/** The refresh token never reaches JavaScript: it lives only in an httpOnly cookie. */
const sendSession = (res, session, status = 200) => {
  res.cookie(COOKIE, session.refreshToken, cookieOptions());
  return res.status(status).json({ success: true, data: { accessToken: session.accessToken, user: session.user } });
};

const register = async (req, res) => {
  const result = await service.register(req.body, meta(req));
  if (result.pendingApproval) {
    return created(res, { pendingApproval: true, user: result.user, message: 'Registration received. An admin will review and activate your account.' });
  }
  return sendSession(res, result, 201);
};

const login = async (req, res) => sendSession(res, await service.login(req.body, meta(req)));

const refresh = async (req, res) => {
  try {
    return sendSession(res, await service.refresh(req.cookies?.[COOKIE], meta(req)));
  } catch (err) {
    res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
    throw err;
  }
};

const logout = async (req, res) => {
  await service.logout(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
  return ok(res, { message: 'Signed out' });
};

const logoutAll = async (req, res) => {
  await service.logoutAll(req.user.id);
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
  return ok(res, { message: 'Signed out from all devices' });
};

const forgotPassword = async (req, res) => ok(res, await service.forgotPassword(req.body, meta(req)));
const verifyOtp = async (req, res) => ok(res, await service.verifyOtp(req.body));
const resetPassword = async (req, res) => ok(res, await service.resetPassword(req.body, meta(req)));

const changePassword = async (req, res) => {
  const session = await service.changePassword(req.user.id, req.body, meta(req));
  res.cookie(COOKIE, session.refreshToken, cookieOptions());
  return ok(res, { accessToken: session.accessToken, message: 'Password changed. Other devices have been signed out.' });
};

const me = async (req, res) => ok(res, await service.me(req.user.id));
const updateMe = async (req, res) => ok(res, await service.updateProfile(req.user, req.body));

const uploadAvatar = async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');
  const [url] = await saveFiles([req.file], 'avatars');
  return ok(res, await service.setAvatar(req.user.id, url));
};

module.exports = { register, login, refresh, logout, logoutAll, forgotPassword, verifyOtp, resetPassword, changePassword, me, updateMe, uploadAvatar };
