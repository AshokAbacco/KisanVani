import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Camera } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section, { DetailList } from '../../components/common/Section';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import StatusBadge from '../../components/common/StatusBadge';
import { Input, Textarea } from '../../components/forms/Field';
import LocationPicker from '../../components/maps/LocationPicker';
import { authApi, mandiApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { applyFieldErrors } from '../../utils/errors';
import { rules } from '../../validators';
import { roleLabel } from '../../constants/roles';
import { formatDate, toDateInput } from '../../utils/format';

const profileOf = (u) => u.shopProfile || u.farmerProfile || u.mandiProfile || u.driverProfile || {};

/** Profile editor for every role: identity, role-specific business details, address and GPS location. */
const ProfilePage = ({ title = 'Profile', description = 'How you appear to buyers, sellers and drivers.' }) => {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const p = profileOf(user);
  const [coords, setCoords] = useState({ lat: p.address?.latitude ?? null, lng: p.address?.longitude ?? null });
  const [commission, setCommission] = useState(user.mandiProfile ? String(Number(user.mandiProfile.commissionPercent)) : '');
  const [savingCommission, setSavingCommission] = useState(false);

  const defaults = () => ({
    name: user.name,
    email: user.email || '',
    shopName: user.shopProfile?.shopName || '',
    gstin: user.shopProfile?.gstin || '',
    receiptFooter: user.shopProfile?.receiptFooter || '',
    farmName: user.farmerProfile?.farmName || '',
    landAcres: user.farmerProfile?.landAcres ?? '',
    primaryCrops: (user.farmerProfile?.primaryCrops || []).join(', '),
    bankAccount: user.farmerProfile?.bankAccount || '',
    ifsc: user.farmerProfile?.ifsc || '',
    mandiName: user.mandiProfile?.mandiName || '',
    marketYardName: user.mandiProfile?.marketYardName || '',
    licenseNumber: user.mandiProfile?.licenseNumber || '',
    licenseExpiry: toDateInput(user.driverProfile?.licenseExpiry),
    experienceYrs: user.driverProfile?.experienceYrs ?? '',
    upiId: p.upiId || '',
    line1: p.address?.line1 || '',
    village: p.address?.village || '',
    city: p.address?.city || '',
    district: p.address?.district || '',
    state: p.address?.state || '',
    pincode: p.address?.pincode || '',
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ defaultValues: defaults() });
  useEffect(() => {
    reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async (v) => {
    const profile = {};
    if (user.role === 'SHOPKEEPER') Object.assign(profile, { shopName: v.shopName, gstin: v.gstin || null, receiptFooter: v.receiptFooter || null, upiId: v.upiId || null });
    if (user.role === 'FARMER')
      Object.assign(profile, {
        farmName: v.farmName || null,
        landAcres: v.landAcres === '' ? null : Number(v.landAcres),
        primaryCrops: v.primaryCrops.split(',').map((s) => s.trim()).filter(Boolean),
        bankAccount: v.bankAccount || null,
        ifsc: v.ifsc || null,
        upiId: v.upiId || null,
      });
    if (user.role === 'MANDI_OWNER') Object.assign(profile, { mandiName: v.mandiName, marketYardName: v.marketYardName || null, licenseNumber: v.licenseNumber || undefined, upiId: v.upiId || null });
    if (user.role === 'DRIVER') Object.assign(profile, { licenseExpiry: v.licenseExpiry || null, experienceYrs: v.experienceYrs === '' ? undefined : Number(v.experienceYrs) });
    const body = { name: v.name, email: v.email || null };
    if (user.role !== 'ADMIN') {
      body.profile = profile;
      body.address = { line1: v.line1 || null, village: v.village || null, city: v.city || null, district: v.district || null, state: v.state || null, pincode: v.pincode || null, latitude: coords.lat, longitude: coords.lng };
    }
    try {
      setUser(await authApi.updateMe(body));
      toast.success('Profile saved');
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUser(await authApi.uploadAvatar(file));
      toast.success('Photo updated');
    } catch (err) {
      toast.error(err);
    }
  };

  const saveCommission = async () => {
    setSavingCommission(true);
    try {
      await mandiApi.setCommission(Number(commission));
      setUser(await authApi.me());
      toast.success('Commission updated. It applies to settlements created from now on.');
    } catch (e) {
      toast.error(e);
    } finally {
      setSavingCommission(false);
    }
  };

  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
          <Section title="Your details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" required error={errors.name?.message} {...register('name', rules.name)} />
              <Input label="E-mail" type="email" hint="Used for password reset" error={errors.email?.message} {...register('email', rules.email)} />
            </div>
          </Section>

          {user.role === 'SHOPKEEPER' && (
            <Section title="Shop">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Shop name" required error={errors.shopName?.message} {...register('shopName', rules.required('Shop name'))} />
                <Input label="GSTIN" {...register('gstin')} />
                <Input label="UPI ID for customer payments" placeholder="shopname@upi" {...register('upiId')} />
                <Input label="Bill footer" placeholder="Thank you! Visit again." {...register('receiptFooter')} />
              </div>
            </Section>
          )}
          {user.role === 'FARMER' && (
            <Section title="Farm">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Farm name" {...register('farmName')} />
                <Input label="Land" suffix="acres" inputMode="decimal" {...register('landAcres')} />
                <Input className="sm:col-span-2" label="Main crops" hint="Comma separated" {...register('primaryCrops')} />
                <Input label="UPI ID for payments" {...register('upiId')} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Bank account" {...register('bankAccount')} />
                  <Input label="IFSC" {...register('ifsc')} />
                </div>
              </div>
            </Section>
          )}
          {user.role === 'MANDI_OWNER' && (
            <Section title="Market Mandi">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Mandi / firm name" required error={errors.mandiName?.message} {...register('mandiName', rules.required('Mandi name'))} />
                <Input label="Market yard" {...register('marketYardName')} />
                <Input label="APMC licence number" {...register('licenseNumber')} />
                <Input label="UPI ID" {...register('upiId')} />
              </div>
            </Section>
          )}
          {user.role === 'DRIVER' && (
            <Section title="Licence">
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Licence number" value={user.driverProfile?.licenseNumber || ''} disabled hint="Contact support to change" />
                <Input label="Valid until" type="date" {...register('licenseExpiry')} />
                <Input label="Years driving" type="number" min="0" {...register('experienceYrs')} />
              </div>
            </Section>
          )}

          {user.role !== 'ADMIN' && (
            <Section title="Address and location" description="Buyers see the distance to you; drivers use the pin for navigation.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Textarea className="sm:col-span-2" rows={2} label="Street / landmark" {...register('line1')} />
                <Input label="Village" {...register('village')} />
                <Input label="Town / city" {...register('city')} />
                <Input label="District" {...register('district')} />
                <Input label="State" {...register('state')} />
                <Input label="Pincode" inputMode="numeric" error={errors.pincode?.message} {...register('pincode', rules.pincode)} />
              </div>
              <div className="mt-5">
                <LocationPicker value={coords} onChange={setCoords} />
              </div>
            </Section>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty && coords.lat === (p.address?.latitude ?? null) && coords.lng === (p.address?.longitude ?? null)}>
              Save profile
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <Section>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar name={user.name} src={user.avatarUrl} size="h-16 w-16" />
                <label className="absolute -bottom-1 -right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full border-2 border-white accent-bg text-white" title="Change photo">
                  <Camera className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">Change photo</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onAvatar} />
                </label>
              </div>
              <div>
                <p className="font-display text-lg font-semibold">{user.name}</p>
                <p className="text-sm text-soil-500">{roleLabel(user.role)}</p>
              </div>
            </div>
            <div className="mt-5">
              <DetailList
                cols={1}
                items={[
                  ['Mobile', user.mobile],
                  ['Status', <StatusBadge key="s" status={user.status} />],
                  ['Member since', formatDate(user.createdAt)],
                  user.shopProfile && ['Shop code', user.shopProfile.shopCode],
                ]}
              />
            </div>
          </Section>
          {user.role === 'MANDI_OWNER' && (
            <Section title="Commission on farmer purchases" description="Deducted from the farmer’s settlement when your mandi buys their produce.">
              <div className="flex items-end gap-2">
                <Input className="flex-1" label="Commission" suffix="%" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} error={commission !== '' && !(Number(commission) >= 0 && Number(commission) <= 15) ? 'Between 0 and 15%' : undefined} />
                <Button onClick={saveCommission} loading={savingCommission} disabled={commission === '' || !(Number(commission) >= 0 && Number(commission) <= 15)}>
                  Save
                </Button>
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
