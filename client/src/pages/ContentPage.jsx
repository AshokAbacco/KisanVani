/** Shared frame for informational pages: title block + readable column. */
const ContentPage = ({ title, intro, children, wide = false }) => (
  <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
    <header className="max-w-3xl">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      {intro && <p className="mt-5 text-lg leading-relaxed text-soil-600">{intro}</p>}
    </header>
    <div className={`mt-12 ${wide ? '' : 'max-w-3xl'}`}>{children}</div>
  </div>
);

/** Long-form legal / policy text with comfortable measure. */
export const Prose = ({ children }) => <div className="space-y-6 text-[17px] leading-[1.7] text-soil-600 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-soil [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">{children}</div>;

/**
 * Renders translated legal text. Each section is { title?, body?, items? }:
 * an optional heading, an optional paragraph and an optional bullet list (in that order).
 */
export const LegalSections = ({ sections = [] }) => (
  <Prose>
    {sections.map(({ title, body, items }, i) => (
      <section key={i} className="space-y-6">
        {title && <h2>{title}</h2>}
        {body && <p>{body}</p>}
        {items?.length > 0 && (
          <ul>
            {items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        )}
      </section>
    ))}
  </Prose>
);

export default ContentPage;