import ContentPage from '../ContentPage';
import { useI18n } from '../../i18n';

const FaqPage = () => {
  const { t } = useI18n();
  const items = t('faq.items');

  return (
    <ContentPage title={t('faq.title')} intro={t('faq.intro')}>
      <div className="divide-y divide-soil-200 border-y border-soil-200">
        {items.map(({ q, a }, i) => (
          <details key={i} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-display text-lg font-semibold">
              {q}
              <span className="mt-1 text-2xl leading-none text-field-600 transition group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="mt-3 leading-relaxed text-soil-600">{a}</p>
          </details>
        ))}
      </div>
    </ContentPage>
  );
};

export default FaqPage;