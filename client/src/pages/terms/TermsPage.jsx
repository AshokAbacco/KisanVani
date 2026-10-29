import ContentPage, { LegalSections } from '../ContentPage';
import { useI18n } from '../../i18n';

const TermsPage = () => {
  const { t } = useI18n();
  return (
    <ContentPage title={t('terms.title')} intro={t('terms.intro')}>
      <LegalSections sections={t('terms.sections')} />
    </ContentPage>
  );
};

export default TermsPage;