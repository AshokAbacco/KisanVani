/** Segmented tabs. `tabs` = [{ value, label, count? }] */
const Tabs = ({ tabs, value, onChange, className = '' }) => (
  <div role="tablist" className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-soil-100 p-1 ${className}`}>
    {tabs.map((t) => {
      const active = t.value === value;
      return (
        <button
          key={t.value ?? 'all'}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(t.value)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${active ? 'bg-white text-soil shadow-sm' : 'text-soil-500 hover:text-soil'}`}
        >
          {t.label}
          {t.count !== undefined && <span className="num ml-1.5 text-xs text-soil-400">{t.count}</span>}
        </button>
      );
    })}
  </div>
);

export default Tabs;
