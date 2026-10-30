import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import { Input, Select, Textarea } from '../../components/forms/Field';
import FileUpload from '../../components/forms/FileUpload';
import LocationPicker from '../../components/maps/LocationPicker';
import { PageLoader } from '../../components/common/Spinner';
import Alert from '../../components/feedback/Alert';
import ProductSelect from '../../features/products/ProductSelect';
import { mandiApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rules } from '../../validators';
import { applyFieldErrors } from '../../utils/errors';
import { formatKg } from '../../utils/format';
import { useI18n } from '../../i18n';

const LOT_TYPES = ['LOOSE', 'BAGGED', 'CRATED', 'BOXED'];

/** Create or edit a wholesale mandi lot. */
const LotFormPage = () => {
  const { t } = useI18n();
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const mp = user.mandiProfile;
  const [lot, setLot] = useState(null);
  const [coords, setCoords] = useState({ lat: mp?.address?.latitude ?? null, lng: mp?.address?.longitude ?? null });
  const [pending, setPending] = useState([]);
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { productId: '', variety: '', grade: '', lotType: 'BAGGED', unitSizeKg: '50', totalWeightKg: '', pricePerKg: '', minOrderKg: '', marketYardName: mp?.marketYardName || '', location: '', district: mp?.address?.district || '', qualityNotes: '', loadingInfo: '' },
  });
  const lotType = watch('lotType');

  useEffect(() => {
    if (!editing) return;
    mandiApi
      .lot(id)
      .then((l) => {
        setLot(l);
        setCoords({ lat: l.latitude, lng: l.longitude });
        reset({
          productId: l.productId,
          variety: l.variety || '',
          grade: l.grade || '',
          lotType: l.lotType,
          unitSizeKg: l.unitSizeKg ? String(Number(l.unitSizeKg)) : '',
          totalWeightKg: String(Number(l.totalWeightKg)),
          pricePerKg: String(Number(l.pricePerKg)),
          minOrderKg: String(Number(l.minOrderKg)),
          marketYardName: l.marketYardName,
          location: l.location || '',
          district: l.district || '',
          qualityNotes: l.qualityNotes || '',
          loadingInfo: l.loadingInfo || '',
        });
      })
      .catch((e) => toast.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submit = async (v, publish) => {
    const body = {
      variety: v.variety || null,
      grade: v.grade || null,
      lotType: v.lotType,
      unitSizeKg: v.lotType === 'LOOSE' ? null : v.unitSizeKg || null,
      totalWeightKg: v.totalWeightKg,
      pricePerKg: v.pricePerKg,
      minOrderKg: v.minOrderKg,
      marketYardName: v.marketYardName,
      location: v.location || null,
      district: v.district || null,
      latitude: coords.lat,
      longitude: coords.lng,
      qualityNotes: v.qualityNotes || null,
      loadingInfo: v.loadingInfo || null,
    };
    try {
      if (editing) {
        setLot(await mandiApi.update(id, body));
        toast.success(t('lotForm.updated'));
      } else {
        const created = await mandiApi.create({ ...body, productId: v.productId, publish });
        if (pending.length) {
          try {
            await mandiApi.addImages(created.id, pending.map((p) => p.file));
          } catch (e) {
            toast.error(t('lotForm.photosFailed', '', { error: e.response?.data?.error?.message || e.message }));
          }
        }
        toast.success(t(publish ? 'lotForm.publishedToast' : 'lotForm.draftToast', '', { code: created.lotCode }));
        navigate('/mandi/lots');
      }
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };

  const onPhotos = async (files) => {
    if (!editing) return setPending((p) => [...p, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 5));
    setUploading(true);
    try {
      setLot(await mandiApi.addImages(id, files));
    } catch (e) {
      toast.error(e);
    } finally {
      setUploading(false);
    }
    return undefined;
  };

  if (editing && !lot) return <PageLoader />;
  const locked = lot?.status === 'CLOSED';
  const reserved = lot ? Number(lot.totalWeightKg) - Number(lot.availableWeightKg) : 0;
  const total = Number(watch('totalWeightKg'));
  const images = editing ? lot.images : pending.map((p) => p.url);

  return (
    <>
      <PageHeader
        back={{ to: '/mandi/lots', label: t('dnav.tabs.mandiLots') }}
        title={editing ? t('lotForm.lotTitle', '', { code: lot.lotCode }) : t('lotForm.newTitle')}
        description={
          editing ? (
            <span className="inline-flex items-center gap-2">
              {lot.commodityName} <StatusBadge status={lot.status} />
            </span>
          ) : (
            t('lotForm.intro')
          )
        }
      />
      {locked && <Alert tone="info" className="mb-6">{t('lotForm.locked')}</Alert>}
      <form noValidate className="grid gap-6 xl:grid-cols-[1.4fr_1fr]" onSubmit={handleSubmit((v) => submit(v, false))}>
        <div className="space-y-6">
          <Section title={t('lots.commodity')}>
            <div className="grid gap-4 sm:grid-cols-2">
              {editing ? <Input label={t('lots.commodity')} value={`${lot.product.emoji || ''} ${lot.commodityName}`} disabled /> : <ProductSelect label={t('lots.commodity')} required error={errors.productId?.message} {...register('productId', rules.required(t('lots.commodity')))} />}
              <Input label={t('listingForm.variety')} disabled={locked} {...register('variety')} />
              <Input label={t('listingForm.grade')} disabled={locked} {...register('grade')} />
              <div className="grid grid-cols-2 gap-3">
                <Select label={t('lotForm.lotType')} options={LOT_TYPES.map((value) => ({ value, label: t(`lotForm.types.${value}`) }))} disabled={locked} {...register('lotType')} />
                {lotType !== 'LOOSE' && <Input label={t('lotForm.unitSize')} suffix="kg" inputMode="decimal" disabled={locked} error={errors.unitSizeKg?.message} {...register('unitSizeKg', rules.positive(t('lotForm.size')))} />}
              </div>
              <Textarea className="sm:col-span-2" label={t('lotForm.qualityNotes')} rows={2} disabled={locked} {...register('qualityNotes')} />
            </div>
          </Section>
          <Section title={t('lotForm.weightPrice')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label={t('lotForm.totalWeight')}
                required
                suffix="kg"
                inputMode="decimal"
                disabled={locked}
                hint={reserved > 0 ? t('lotForm.alreadyReserved', '', { qty: formatKg(reserved, { grams: false }) }) : undefined}
                error={errors.totalWeightKg?.message}
                {...register('totalWeightKg', { ...rules.positive(t('pos.weight')), validate: (v) => (rules.positive(t('pos.weight')).validate(v) === true ? Number(v) >= reserved || t('lotForm.atLeastReserved', '', { n: reserved }) : rules.positive(t('pos.weight')).validate(v)) })}
              />
              <Input label={t('common.price')} required suffix="₹/kg" inputMode="decimal" disabled={locked} error={errors.pricePerKg?.message} {...register('pricePerKg', rules.money(t('common.price')))} />
              <Input
                label={t('lotForm.minOrder')}
                required
                suffix="kg"
                inputMode="decimal"
                disabled={locked}
                error={errors.minOrderKg?.message}
                {...register('minOrderKg', { ...rules.positive(t('lotForm.minimum')), validate: (v) => (rules.positive(t('lotForm.minimum')).validate(v) === true ? !total || Number(v) <= total || t('listingForm.notOverTotal') : rules.positive(t('lotForm.minimum')).validate(v)) })}
              />
            </div>
          </Section>
          <Section title={t('lotForm.yardLoading')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('lotForm.yardName')} required disabled={locked} error={errors.marketYardName?.message} {...register('marketYardName', rules.required(t('lotForm.marketYard')))} />
              <Input label={t('lotForm.shed')} disabled={locked} {...register('location')} />
              <Input label={t('common.district')} disabled={locked} {...register('district')} />
              <Input label={t('lotForm.loadingInfo')} placeholder={t('lotForm.loadingPlaceholder')} disabled={locked} {...register('loadingInfo')} />
            </div>
          </Section>
        </div>
        <div className="space-y-6">
          <Section title={t('listingForm.photos')} description={t('lotForm.upTo5')}>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {images.map((src) => (
                <div key={src} className="relative">
                  <img src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  {!locked && (
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow"
                      aria-label={t('listingForm.removePhoto')}
                      onClick={async () => {
                        if (!editing) return setPending((p) => p.filter((x) => x.url !== src));
                        try {
                          setLot(await mandiApi.removeImage(id, src));
                        } catch (e) {
                          toast.error(e);
                        }
                        return undefined;
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!locked && images.length < 5 && <FileUpload multiple onFiles={onPhotos} disabled={uploading} label={uploading ? t('common.uploading') : t('listingForm.addPhotos')} />}
          </Section>
          <Section title={t('lotForm.yardLocation')}>
            <LocationPicker value={coords} onChange={locked ? () => {} : setCoords} height={240} />
          </Section>
          {!locked && (
            <div className="flex justify-end gap-2">
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
                    {t('lotForm.publishLot')}
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

export default LotFormPage;
