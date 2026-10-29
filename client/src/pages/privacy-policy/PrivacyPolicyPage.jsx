import ContentPage, { LegalSections } from '../ContentPage';
import { useI18n } from '../../i18n';

const PrivacyPolicyPage = () => {
  const { t } = useI18n();
  return (
    <ContentPage title={t('privacy.title')} intro={t('privacy.intro')}>
      <LegalSections sections={t('privacy.sections')} />
    </ContentPage>
  );
};

export default PrivacyPolicyPage;