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
import { useI18n } from '../../i18n';

const profileOf = (u) => u.shopProfile || u.farmerProfile || u.mandiProfile || u.driverProfile || {};

/** Profile editor for every role: identity, role-specific business details, address and GPS location. */
/** `copy` is the locale key holding this screen's title (routes.<screen>); the description is shared. */
const ProfilePage = ({ copy }) => {
  const { t } = useI18n();
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
      toast.success(t('profile.saved'));
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUser(await authApi.uploadAvatar(file));
      toast.success(t('profile.photoUpdated'));
    } catch (err) {
      toast.error(err);
    }
  };

  const saveCommission = async () => {
    setSavingCommission(true);
    try {
      await mandiApi.setCommission(Number(commission));
      setUser(await authApi.me());
      toast.success(t('profile.commissionUpdated'));
    } catch (e) {
      toast.error(e);
    } finally {
      setSavingCommission(false);
    }
  };

  return (
    <>
      <PageHeader title={copy ? t(`${copy}.title`) : t('common.profile')} description={t('profile.intro')} />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
          <Section title={t('profile.yourDetails')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('users.fullName')} required error={errors.name?.message} {...register('name', rules.name)} />
              <Input label={t('common.email')} type="email" hint={t('profile.emailHint')} error={errors.email?.message} {...register('email', rules.email)} />
            </div>
          </Section>

          {user.role === 'SHOPKEEPER' && (
            <Section title={t('shopGps.shop')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('users.orgName.SHOPKEEPER')} required error={errors.shopName?.message} {...register('shopName', rules.required(t('users.orgName.SHOPKEEPER')))} />
                <Input label="GSTIN" {...register('gstin')} />
                <Input label={t('profile.upiCustomers')} placeholder="shopname@upi" {...register('upiId')} />
                <Input label={t('profile.billFooter')} placeholder={t('receipt.thanks')} {...register('receiptFooter')} />
              </div>
            </Section>
          )}
          {user.role === 'FARMER' && (
            <Section title={t('userDetail.farm')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('users.orgName.FARMER')} {...register('farmName')} />
                <Input label={t('profile.land')} suffix={t('profile.acres')} inputMode="decimal" {...register('landAcres')} />
                <Input className="sm:col-span-2" label={t('profile.mainCrops')} hint={t('profile.commaSeparated')} {...register('primaryCrops')} />
                <Input label={t('profile.upiPayments')} {...register('upiId')} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label={t('profile.bankAccount')} {...register('bankAccount')} />
                  <Input label="IFSC" {...register('ifsc')} />
                </div>
              </div>
            </Section>
          )}
          {user.role === 'MANDI_OWNER' && (
            <Section title={t('roles.MANDI_OWNER')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('profile.mandiFirm')} required error={errors.mandiName?.message} {...register('mandiName', rules.required(t('users.orgName.MANDI_OWNER')))} />
                <Input label={t('lotForm.marketYard')} {...register('marketYardName')} />
                <Input label={t('profile.apmcNumber')} {...register('licenseNumber')} />
                <Input label={t('profile.upiId')} {...register('upiId')} />
              </div>
            </Section>
          )}
          {user.role === 'DRIVER' && (
            <Section title={t('users.licence')}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label={t('profile.licenceNumber')} value={user.driverProfile?.licenseNumber || ''} disabled hint={t('profile.contactSupport')} />
                <Input label={t('vehicles.validUntil')} type="date" {...register('licenseExpiry')} />
                <Input label={t('profile.yearsDriving')} type="number" min="0" {...register('experienceYrs')} />
              </div>
            </Section>
          )}

          {user.role !== 'ADMIN' && (
            <Section title={t('profile.addressLocation')} description={t('profile.addressIntro')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Textarea className="sm:col-span-2" rows={2} label={t('profile.street')} {...register('line1')} />
                <Input label={t('common.village')} {...register('village')} />
                <Input label={t('profile.city')} {...register('city')} />
                <Input label={t('common.district')} {...register('district')} />
                <Input label={t('profile.state')} {...register('state')} />
                <Input label={t('profile.pincode')} inputMode="numeric" error={errors.pincode?.message} {...register('pincode', rules.pincode)} />
              </div>
              <div className="mt-5">
                <LocationPicker value={coords} onChange={setCoords} />
              </div>
            </Section>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty && coords.lat === (p.address?.latitude ?? null) && coords.lng === (p.address?.longitude ?? null)}>
              {t('profile.save')}
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <Section>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar name={user.name} src={user.avatarUrl} size="h-16 w-16" />
                <label className="absolute -bottom-1 -right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full border-2 border-white accent-bg text-white" title={t('profile.changePhoto')}>
                  <Camera className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">{t('profile.changePhoto')}</span>
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
                  [t('common.mobile'), user.mobile],
                  [t('common.status'), <StatusBadge key="s" status={user.status} />],
                  [t('profile.memberSince'), formatDate(user.createdAt)],
                  user.shopProfile && [t('shopGps.shopCode'), user.shopProfile.shopCode],
                ]}
              />
            </div>
          </Section>
          {user.role === 'MANDI_OWNER' && (
            <Section title={t('profile.commissionTitle')} description={t('profile.commissionIntro')}>
              <div className="flex items-end gap-2">
                <Input className="flex-1" label={t('userDetail.commission')} suffix="%" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} error={commission !== '' && !(Number(commission) >= 0 && Number(commission) <= 15) ? t('profile.between0and15') : undefined} />
                <Button onClick={saveCommission} loading={savingCommission} disabled={commission === '' || !(Number(commission) >= 0 && Number(commission) <= 15)}>
                  {t('common.save')}
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
