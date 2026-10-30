import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useI18n } from '../../i18n';

const MAX_MB = 5;

/**
 * File picker with drag & drop and client-side type/size checks (the server re-checks content signatures).
 * onFiles(File[]) is called with the accepted files.
 */
const FileUpload = ({ accept = 'image/jpeg,image/png,image/webp', multiple = false, onFiles, label, hint, disabled }) => {
  const { t } = useI18n();
  const input = useRef(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handle = (list) => {
    const files = [...(list || [])];
    const allowed = accept.split(',').map((s) => s.trim());
    const bad = files.find((f) => !allowed.includes(f.type));
    if (bad) return setError(t('components.fileUpload.badType', '', { name: bad.name }));
    const big = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (big) return setError(t('components.fileUpload.tooBig', '', { name: big.name, mb: MAX_MB }));
    setError(null);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
    if (input.current) input.current.value = '';
    return undefined;
  };

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-sm transition disabled:opacity-50 ${dragging ? 'border-field-500 bg-field-50' : 'border-soil-300 bg-white hover:bg-soil-100'}`}
      >
        <Upload className="h-5 w-5 text-soil-400" aria-hidden />
        <span className="font-medium text-soil-600">{label ?? t('components.fileUpload.label')}</span>
        <span className="text-xs text-soil-400">{hint || t(accept.includes('pdf') ? 'components.fileUpload.hintPdf' : 'components.fileUpload.hintImage', '', { mb: MAX_MB })}</span>
      </button>
      <input ref={input} type="file" className="hidden" accept={accept} multiple={multiple} onChange={(e) => handle(e.target.files)} />
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUpload;