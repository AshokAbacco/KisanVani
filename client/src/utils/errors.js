/** Extracts a human-readable message from an API/axios error. */
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (!err) return fallback;
  if (err.code === 'ERR_NETWORK') return 'Cannot reach the KisanVani server. Check your connection and that the API is running.';
  const apiErr = err.response?.data?.error;
  if (apiErr?.details?.length && apiErr.code === 'VALIDATION_ERROR') {
    return apiErr.details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join('; ');
  }
  return apiErr?.message || err.message || fallback;
};

/** Maps server validation details onto react-hook-form fields. Returns true when any field matched. */
export const applyFieldErrors = (err, setError) => {
  const details = err?.response?.data?.error?.details;
  if (!Array.isArray(details)) return false;
  let matched = false;
  details.forEach((d) => {
    if (d.path) {
      setError(d.path, { type: 'server', message: d.message });
      matched = true;
    }
  });
  return matched;
};

export const errorCode = (err) => err?.response?.data?.error?.code;
