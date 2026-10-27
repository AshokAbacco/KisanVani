const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../config/logger');
const { passwordResetEmail } = require('../templates/emails');

let transporter = null;
const getTransporter = () => {
  if (!config.smtp.enabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
};

/**
 * Sends a password-reset e-mail. Without SMTP configuration the message is logged in
 * development so the flow can be tested locally; in production it reports the missing configuration.
 * @returns {Promise<'sent'|'logged'|'unavailable'>}
 */
const sendPasswordReset = async ({ to, name, resetUrl, otp }) => {
  const mail = passwordResetEmail({ name, resetUrl, otp });
  const t = getTransporter();
  if (!t) {
    if (!config.isProd) {
      logger.info(`[DEV] Password reset for ${to}: OTP ${otp} — ${resetUrl}`);
      return 'logged';
    }
    logger.error('Password reset requested but SMTP is not configured');
    return 'unavailable';
  }
  await t.sendMail({ from: config.smtp.from, to, subject: mail.subject, text: mail.text, html: mail.html });
  return 'sent';
};

module.exports = { sendPasswordReset };
