import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const STYLES = {
  info: ['border-river-100 bg-river-50 text-river-700', Info],
  success: ['border-field-200 bg-field-50 text-field-800', CheckCircle2],
  warning: ['border-turmeric-100 bg-turmeric-50 text-turmeric-700', AlertTriangle],
  error: ['border-red-200 bg-red-50 text-red-800', XCircle],
};

const Alert = ({ tone = 'info', title, children, action, className = '' }) => {
  const [cls, Icon] = STYLES[tone];
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${cls} ${className}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {action}
    </div>
  );
};

export default Alert;
