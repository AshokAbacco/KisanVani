/** A titled panel. Use for grouping related content on a page. */
const Section = ({ title, description, actions, children, className = '', bodyClass = 'p-4 sm:p-5' }) => (
  <section className={`panel ${className}`}>
    {(title || actions) && (
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-soil-200 px-4 py-3 sm:px-5">
        <div>
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {description && <p className="text-sm text-soil-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className={bodyClass}>{children}</div>
  </section>
);

/** Definition list for read-only details. items = [[label, value], …] */
export const DetailList = ({ items, cols = 2 }) => (
  <dl className={`grid gap-x-6 gap-y-3 ${cols === 3 ? 'sm:grid-cols-3' : cols === 1 ? '' : 'sm:grid-cols-2'}`}>
    {items
      .filter(Boolean)
      .map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-soil-500">{label}</dt>
          <dd className="mt-0.5 break-words text-[15px] text-soil">{value ?? '—'}</dd>
        </div>
      ))}
  </dl>
);

export default Section;
