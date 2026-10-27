import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'accent-bg text-white hover:brightness-95 shadow-sm',
  secondary: 'border border-soil-300 bg-white text-soil hover:bg-soil-100',
  ghost: 'text-soil-600 hover:bg-soil-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  subtle: 'accent-soft accent-text hover:brightness-95',
};
const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-[15px] gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  icon: 'h-9 w-9 justify-center',
};

/** Button or link styled as a button. Pass `to` for router links, `href` for external links. */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, iconRight: IconRight, to, href, className = '', children, disabled, type = 'button', ...rest },
  ref
) {
  const cls = `inline-flex items-center justify-center rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
    </>
  );
  if (to)
    return (
      <Link ref={ref} to={to} className={cls} {...rest}>
        {content}
      </Link>
    );
  if (href)
    return (
      <a ref={ref} href={href} className={cls} target="_blank" rel="noreferrer" {...rest}>
        {content}
      </a>
    );
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});

export default Button;
