import ContentPage from '../ContentPage';
import Button from '../../components/common/Button';
import { useI18n } from '../../i18n';

const AboutPage = () => {
  const { t } = useI18n();
  const paragraphs = t('about.paragraphs');
  const principles = t('about.principles');

  return (
    <ContentPage title={t('about.title')} intro={t('about.intro')} wide>
      <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5 text-[17px] leading-relaxed text-soil-600">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <Button to="/register" className="mt-2">
            {t('about.cta')}
          </Button>
        </div>
        <dl className="space-y-8">
          {principles.map(({ title, body }, i) => (
            <div key={i} className="border-l-4 border-field-500 pl-5">
              <dt className="font-display text-xl font-semibold">{title}</dt>
              <dd className="mt-1.5 text-soil-600">{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </ContentPage>
  );
};

export default AboutPage;