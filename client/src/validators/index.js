// react-hook-form rule sets mirroring the server's Zod validation, so users see errors before submitting.
// Messages are read through getters/functions at register() time, so they always come out in the
// active language (keys under `validation` in the locale files).
import { translate } from '../i18n';

const v = (key, fallback, vars) => translate(`validation.${key}`, fallback, vars);
const isMobile = (val) => /^[6-9]\d{9}$/.test(String(val).replace(/[\s-]/g, '').replace(/^\+91/, '').replace(/^0/, ''));

export const rules = {
  required: (label = translate('validation.thisField', 'This field')) => ({ required: v('required', '{label} is required', { label }) }),
  get name() {
    return {
      required: v('nameRequired', 'Name is required'),
      minLength: { value: 2, message: v('min2', 'Enter at least 2 characters') },
      maxLength: { value: 100, message: v('tooLong', 'Too long') },
    };
  },
  get mobile() {
    return { required: v('mobileRequired', 'Mobile number is required'), validate: (val) => isMobile(val) || v('mobileInvalid', 'Enter a valid 10-digit Indian mobile number') };
  },
  get optionalMobile() {
    return { validate: (val) => !val || isMobile(val) || v('mobileInvalid', 'Enter a valid 10-digit Indian mobile number') };
  },
  get email() {
    return { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: v('emailInvalid', 'Enter a valid e-mail address') } };
  },
  get password() {
    return {
      required: v('passwordRequired', 'Password is required'),
      minLength: { value: 8, message: v('min8', 'At least 8 characters') },
      maxLength: { value: 72, message: v('max72', 'At most 72 characters') },
      validate: (val) => (/[A-Za-z]/.test(val) && /\d/.test(val)) || v('letterNumber', 'Use at least one letter and one number'),
    };
  },
  positive: (label = translate('validation.value', 'Value')) => ({
    required: v('required', '{label} is required', { label }),
    validate: (val) => (Number(val) > 0 && /^\d+(\.\d{1,3})?$/.test(String(val))) || v('positive', '{label} must be a positive number (max 3 decimals)', { label }),
  }),
  money: (label = translate('validation.amount', 'Amount'), { allowZero = false } = {}) => ({
    required: v('required', '{label} is required', { label }),
    validate: (val) => ((allowZero ? Number(val) >= 0 : Number(val) > 0) && /^\d+(\.\d{1,2})?$/.test(String(val))) || v('money', '{label} must be a valid amount (max 2 decimals)', { label }),
  }),
  get pincode() {
    return { validate: (val) => !val || /^\d{6}$/.test(val) || v('pincode', 'Pincode must be 6 digits') };
  },
};

/** Kept for the auth screens: same rules, already in the active language. */
export const makeRules = () => rules;

export default rules;
