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

/**
 * The shop's GPS pin. It is used to show distance to farmers' listings and mandi lots, and as the drop point
 * that drivers navigate to.
 */
const ShopGpsPage = () => {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const addr = user.shopProfile?.address;
  const [coords, setCoords] = useState({ lat: addr?.latitude ?? null, lng: addr?.longitude ?? null });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      setUser(await authApi.updateMe({ address: { latitude: coords.lat, longitude: coords.lng } }));
      toast.success('Shop location saved');
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Shop GPS profile" description="Set the exact spot of your shop so suppliers and drivers can find it." />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Section title="Pin your shop">
          <LocationPicker value={coords} onChange={setCoords} height={420} />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {coords.lat != null && (
              <Button variant="secondary" icon={Navigation} href={placeUrl(coords.lat, coords.lng)}>
                Open in maps
              </Button>
            )}
            <Button icon={MapPin} onClick={save} loading={saving}>
              Save location
            </Button>
          </div>
        </Section>
        <div className="space-y-6">
          <Section title="Shop address">
            <DetailList
              cols={1}
              items={[
                ['Shop', user.shopProfile?.shopName],
                ['Address', [addr?.line1, addr?.city, addr?.district, addr?.state, addr?.pincode].filter(Boolean).join(', ') || 'Not set'],
                ['Shop code', user.shopProfile?.shopCode],
              ]}
            />
            <Button to="/shop/profile" variant="secondary" size="sm" className="mt-4">
              Edit address & bill details
            </Button>
          </Section>
          <Alert tone="info" title="Why it matters">
            Marketplace listings show how far each farm or mandi is from this pin, and new delivery requests use it as the default drop point.
          </Alert>
        </div>
      </div>
    </>
  );
};

export default ShopGpsPage;
