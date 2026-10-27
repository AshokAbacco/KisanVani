const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const passwordResetEmail = ({ name, resetUrl, otp }) => ({
  subject: 'Reset your KisanVani password',
  text: `Namaste ${name},\n\nUse this code to reset your KisanVani password: ${otp}\nOr open: ${resetUrl}\n\nThe code expires in 15 minutes. If you did not request this, you can ignore this e-mail.`,
  html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
  <h2 style="color:#15803d">KisanVani</h2>
  <p>Namaste ${esc(name)},</p>
  <p>Use this verification code to reset your password:</p>
  <p style="font-size:28px;letter-spacing:6px;font-weight:bold;color:#15803d">${esc(otp)}</p>
  <p>Or click the button below:</p>
  <p><a href="${esc(resetUrl)}" style="background:#15803d;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p>
  <p style="color:#6b7280;font-size:13px">The code and link expire in 15 minutes. If you did not request this, ignore this e-mail.</p>
</div>`,
});

module.exports = { passwordResetEmail };
