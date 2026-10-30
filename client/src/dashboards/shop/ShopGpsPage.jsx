import { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section, { DetailList } from '../../components/common/Section';
import Button from '../../components/common/Button';
import Alert from '../../components/feedback/Alert';
import LocationPicker from '../../components/maps/LocationPicker';
import { authApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { placeUrl } from '../../utils/maps';
import { useI18n } from '../../i18n';

/**
 * The shop's GPS pin. It is used to show distance to farmers' listings and mandi lots, and as the drop point
 * that drivers navigate to.
 */
const ShopGpsPage = () => {
  const { t } = useI18n();
  const { user, setUser } = useAuth();
  const toast = useToast();
  const addr = user.shopProfile?.address;
  const [coords, setCoords] = useState({ lat: addr?.latitude ?? null, lng: addr?.longitude ?? null });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      setUser(await authApi.updateMe({ address: { latitude: coords.lat, longitude: coords.lng } }));
      toast.success(t('shopGps.saved'));
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={t('shopGps.title')} description={t('shopGps.intro')} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Section title={t('shopGps.pin')}>
          <LocationPicker value={coords} onChange={setCoords} height={420} />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {coords.lat != null && (
              <Button variant="secondary" icon={Navigation} href={placeUrl(coords.lat, coords.lng)}>
                {t('common.openInMaps')}
              </Button>
            )}
            <Button icon={MapPin} onClick={save} loading={saving}>
              {t('shopGps.saveLocation')}
            </Button>
          </div>
        </Section>
        <div className="space-y-6">
          <Section title={t('shopGps.address')}>
            <DetailList
              cols={1}
              items={[
                [t('shopGps.shop'), user.shopProfile?.shopName],
                [t('common.address'), [addr?.line1, addr?.city, addr?.district, addr?.state, addr?.pincode].filter(Boolean).join(', ') || t('common.notSet')],
                [t('shopGps.shopCode'), user.shopProfile?.shopCode],
              ]}
            />
            <Button to="/shop/profile" variant="secondary" size="sm" className="mt-4">
              {t('shopGps.editAddress')}
            </Button>
          </Section>
          <Alert tone="info" title={t('shopGps.whyTitle')}>
            {t('shopGps.whyBody')}
          </Alert>
        </div>
      </div>
    </>
  );
};

export default ShopGpsPage;
