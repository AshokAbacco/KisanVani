// react-hook-form rule sets mirroring the server's Zod validation, so users see errors before submitting.

export const rules = {
  required: (label = 'This field') => ({ required: `${label} is required` }),
  name: { required: 'Name is required', minLength: { value: 2, message: 'Enter at least 2 characters' }, maxLength: { value: 100, message: 'Too long' } },
  mobile: {
    required: 'Mobile number is required',
    validate: (v) => /^[6-9]\d{9}$/.test(String(v).replace(/[\s-]/g, '').replace(/^\+91/, '').replace(/^0/, '')) || 'Enter a valid 10-digit Indian mobile number',
  },
  optionalMobile: {
    validate: (v) => !v || /^[6-9]\d{9}$/.test(String(v).replace(/[\s-]/g, '').replace(/^\+91/, '').replace(/^0/, '')) || 'Enter a valid 10-digit Indian mobile number',
  },
  email: { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid e-mail address' } },
  password: {
    required: 'Password is required',
    minLength: { value: 8, message: 'At least 8 characters' },
    maxLength: { value: 72, message: 'At most 72 characters' },
    validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Use at least one letter and one number',
  },
  positive: (label = 'Value') => ({
    required: `${label} is required`,
    validate: (v) => (Number(v) > 0 && /^\d+(\.\d{1,3})?$/.test(String(v))) || `${label} must be a positive number (max 3 decimals)`,
  }),
  money: (label = 'Amount', { allowZero = false } = {}) => ({
    required: `${label} is required`,
    validate: (v) => ((allowZero ? Number(v) >= 0 : Number(v) > 0) && /^\d+(\.\d{1,2})?$/.test(String(v))) || `${label} must be a valid amount (max 2 decimals)`,
  }),
  pincode: { validate: (v) => !v || /^\d{6}$/.test(v) || 'Pincode must be 6 digits' },
};

export default rules;
