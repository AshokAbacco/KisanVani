import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import { Input, Textarea } from '../../components/forms/Field';
import FileUpload from '../../components/forms/FileUpload';
import LocationPicker from '../../components/maps/LocationPicker';
import { PageLoader } from '../../components/common/Spinner';
import Alert from '../../components/feedback/Alert';
import ProductSelect from '../../features/products/ProductSelect';
import { farmerApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rules } from '../../validators';
import { applyFieldErrors } from '../../utils/errors';
import { toDateTimeInput, formatKg } from '../../utils/format';
import { useI18n } from '../../i18n';

/** Create or edit a harvest listing, including photos and the farm's GPS position. */
const ListingFormPage = () => {
  const { t } = useI18n();
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const home = user.farmerProfile?.address;
  const [listing, setListing] = useState(null);
  const [coords, setCoords] = useState({ lat: home?.latitude ?? null, lng: home?.longitude ?? null });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { productId: '', variety: '', grade: '', description: '', harvestAt: toDateTimeInput(new Date()), totalQuantityKg: '', pricePerKg: '', minOrderKg: '', village: home?.village || '', district: home?.district || '', freshnessNotes: '' },
  });

  useEffect(() => {
    if (!editing) return;
    farmerApi
      .listing(id)
      .then((l) => {
        setListing(l);
        setCoords({ lat: l.latitude, lng: l.longitude });
        reset({
          productId: l.productId,
          variety: l.variety || '',
          grade: l.grade || '',
          description: l.description || '',
          harvestAt: toDateTimeInput(l.harvestAt),
          totalQuantityKg: String(Number(l.totalQuantityKg)),
          pricePerKg: String(Number(l.pricePerKg)),
          minOrderKg: String(Number(l.minOrderKg)),
          village: l.village || '',
          district: l.district || '',
          freshnessNotes: l.freshnessNotes || '',
        });
      })
      .catch((e) => toast.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const uploadImages = async (listingId, files) => {
    if (!files.length) return null;
    setUploading(true);
    try {
      return await farmerApi.addImages(listingId, files);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (v, publish) => {
    const body = {
      variety: v.variety || null,
      grade: v.grade || null,
      description: v.description || null,
      harvestAt: new Date(v.harvestAt).toISOString(),
      totalQuantityKg: v.totalQuantityKg,
      pricePerKg: v.pricePerKg,
      minOrderKg: v.minOrderKg,
      village: v.village || null,
      district: v.district || null,
      latitude: coords.lat,
      longitude: coords.lng,
      freshnessNotes: v.freshnessNotes || null,
    };
    try {
      if (editing) {
        const updated = await farmerApi.update(id, body);
        setListing(updated);
        toast.success(t('listingForm.updated'));
      } else {
        const created = await farmerApi.create({ ...body, productId: v.productId, publish });
        if (pendingFiles.length) {
          try {
            await uploadImages(created.id, pendingFiles.map((p) => p.file));
          } catch (e) {
            toast.error(t('listingForm.photosFailed', '', { error: e.response?.data?.error?.message || e.message }));
          }
        }
        toast.success(t(publish ? 'listingForm.published' : 'listingForm.savedDraft'));
        navigate('/farmer/listings');
      }
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };

  const onPhotos = async (files) => {
    if (editing) {
      try {
        setListing(await uploadImages(id, files));
        toast.success(t('listingForm.photosAdded'));
      } catch (e) {
        toast.error(e);
      }
    } else setPendingFiles((f) => [...f, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 5));
  };

  const removePhoto = async (url) => {
    try {
      setListing(await farmerApi.removeImage(id, url));
    } catch (e) {
      toast.error(e);
    }
  };

  if (editing && !listing) return <PageLoader />;
  const locked = listing?.status === 'COMPLETED';
  const total = Number(watch('totalQuantityKg'));
  const ordered = listing ? Number(listing.totalQuantityKg) - Number(listing.availableQuantityKg) : 0;

  return (
    <>
      <PageHeader
        back={{ to: '/farmer/listings', label: t('listings.title') }}
        title={editing ? t('stock.editTitle', '', { name: listing.cropName }) : t('dnav.tabs.postNewHarvest')}
        description={
          editing ? (
            <span className="inline-flex items-center gap-2">
              {t('common.status')} <StatusBadge status={listing.status} />
            </span>
          ) : (
            t('listingForm.intro')
          )
        }
      />
      {locked && <Alert tone="info" className="mb-6">{t('listingForm.locked')}</Alert>}
      <form noValidate className="grid gap-6 xl:grid-cols-[1.4fr_1fr]" onSubmit={handleSubmit((v) => submit(v, false))}>
        <div className="space-y-6">
          <Section title={t('crops.crop')}>
            <div className="grid gap-4 sm:grid-cols-2">
              {editing ? (
                <Input label={t('crops.crop')} value={`${listing.product.emoji || ''} ${listing.cropName}`} disabled hint={t('listingForm.cropFixed')} />
              ) : (
                <ProductSelect label={t('crops.crop')} required error={errors.productId?.message} {...register('productId', rules.required(t('crops.crop')))} />
              )}
              <Input label={t('listingForm.harvestDateTime')} type="datetime-local" required error={errors.harvestAt?.message} disabled={locked} {...register('harvestAt', rules.required(t('listingForm.harvestDate')))} />
              <Input label={t('listingForm.variety')} placeholder={t('listingForm.varietyPlaceholder')} disabled={locked} {...register('variety')} />
              <Input label={t('listingForm.grade')} placeholder={t('listingForm.gradePlaceholder')} disabled={locked} {...register('grade')} />
              <Textarea className="sm:col-span-2" label={t('listingForm.description')} rows={3} disabled={locked} {...register('description')} />
              <Input className="sm:col-span-2" label={t('listingForm.freshness')} placeholder={t('listingForm.freshnessPlaceholder')} disabled={locked} {...register('freshnessNotes')} />
            </div>
          </Section>
          <Section title={t('listingForm.qtyPrice')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label={t('listingForm.totalQty')}
                required
                suffix="kg"
                inputMode="decimal"
                disabled={locked}
                hint={editing && ordered > 0 ? t('listingForm.alreadyOrdered', '', { qty: formatKg(ordered, { grams: false }) }) : undefined}
                error={errors.totalQuantityKg?.message}
                {...register('totalQuantityKg', { ...rules.positive(t('common.quantity')), validate: (v) => (rules.positive(t('common.quantity')).validate(v) === true ? Number(v) >= ordered || t('listingForm.atLeastOrdered', '', { n: ordered }) : rules.positive(t('common.quantity')).validate(v)) })}
              />
              <Input label={t('common.price')} required suffix="₹/kg" inputMode="decimal" disabled={locked} error={errors.pricePerKg?.message} {...register('pricePerKg', rules.money(t('common.price')))} />
              <Input
                label={t('listingForm.minOrder')}
                required
                suffix="kg"
                inputMode="decimal"
                disabled={locked}
                error={errors.minOrderKg?.message}
                {...register('minOrderKg', { ...rules.positive(t('listingForm.minOrder')), validate: (v) => (rules.positive(t('listingForm.minOrder')).validate(v) === true ? !total || Number(v) <= total || t('listingForm.notOverTotal') : rules.positive(t('listingForm.minOrder')).validate(v)) })}
              />
            </div>
            {editing && <p className="mt-3 text-sm text-soil-500">{t('listingForm.priceNote')}</p>}
          </Section>
        </div>
        <div className="space-y-6">
          <Section title={t('listingForm.photos')} description={t('listingForm.photosIntro')}>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {(editing ? listing.images : pendingFiles.map((p) => p.url)).map((src) => (
                <div key={src} className="relative">
                  <img src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => (editing ? removePhoto(src) : setPendingFiles((f) => f.filter((x) => x.url !== src)))}
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow"
                      aria-label={t('listingForm.removePhoto')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!locked && (editing ? listing.images.length : pendingFiles.length) < 5 && <FileUpload multiple onFiles={onPhotos} disabled={uploading} label={uploading ? t('common.uploading') : t('listingForm.addPhotos')} />}
          </Section>
          <Section title={t('listingForm.farmLocation')}>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Input label={t('common.village')} disabled={locked} {...register('village')} />
              <Input label={t('common.district')} disabled={locked} {...register('district')} />
            </div>
            <LocationPicker value={coords} onChange={locked ? () => {} : setCoords} height={220} />
          </Section>
          {!locked && (
            <div className="flex flex-wrap justify-end gap-2">
              {editing ? (
                <Button type="submit" loading={isSubmitting}>
                  {t('common.saveChanges')}
                </Button>
              ) : (
                <>
                  <Button type="submit" variant="secondary" loading={isSubmitting}>
                    {t('listingForm.saveDraft')}
                  </Button>
                  <Button onClick={handleSubmit((v) => submit(v, true))} loading={isSubmitting}>
                    {t('listingForm.publishHarvest')}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </form>
    </>
  );
};

export default ListingFormPage;
