const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const { authLimiter } = require('../../middlewares/rateLimit');
const { imageUpload } = require('../../middlewares/upload');
const v = require('./auth.validation');
const c = require('./auth.controller');

// Public
router.post('/register', authLimiter, validate({ body: v.register }), h(c.register));
router.post('/login', authLimiter, validate({ body: v.login }), h(c.login));
router.post('/refresh', h(c.refresh));
router.post('/logout', h(c.logout));
router.post('/forgot-password', authLimiter, validate({ body: v.forgotPassword }), h(c.forgotPassword));
router.post('/verify-otp', authLimiter, validate({ body: v.verifyOtp }), h(c.verifyOtp));
router.post('/reset-password', authLimiter, validate({ body: v.resetPassword }), h(c.resetPassword));

// Authenticated (any role)
router.get('/me', authenticate, h(c.me));
router.patch('/me', authenticate, validate({ body: v.updateProfile }), h(c.updateMe));
router.post('/me/avatar', authenticate, imageUpload.single('avatar'), h(c.uploadAvatar));
router.post('/change-password', authenticate, validate({ body: v.changePassword }), h(c.changePassword));
router.post('/logout-all', authenticate, h(c.logoutAll));

module.exports = router;
