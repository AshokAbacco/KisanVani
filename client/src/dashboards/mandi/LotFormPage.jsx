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

const LOT_TYPES = [
  { value: 'LOOSE', label: 'Loose' },
  { value: 'BAGGED', label: 'Bags' },
  { value: 'CRATED', label: 'Crates' },
  { value: 'BOXED', label: 'Boxes' },
];

/** Create or edit a wholesale mandi lot. */
const LotFormPage = () => {
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
        toast.success('Lot updated');
      } else {
        const created = await mandiApi.create({ ...body, productId: v.productId, publish });
        if (pending.length) {
          try {
            await mandiApi.addImages(created.id, pending.map((p) => p.file));
          } catch (e) {
            toast.error(`Lot saved, but photos failed: ${e.response?.data?.error?.message || e.message}`);
          }
        }
        toast.success(`Lot ${created.lotCode} ${publish ? 'is now available to shops' : 'saved as draft'}`);
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
        back={{ to: '/mandi/lots', label: 'Mandi lots' }}
        title={editing ? `Lot ${lot.lotCode}` : 'Create new mandi lot'}
        description={editing ? <span className="inline-flex items-center gap-2">{lot.commodityName} <StatusBadge status={lot.status} /></span> : 'Describe the lot as a buyer would want to see it at the yard.'}
      />
      {locked && <Alert tone="info" className="mb-6">This lot is closed and can no longer be edited.</Alert>}
      <form noValidate className="grid gap-6 xl:grid-cols-[1.4fr_1fr]" onSubmit={handleSubmit((v) => submit(v, false))}>
        <div className="space-y-6">
          <Section title="Commodity">
            <div className="grid gap-4 sm:grid-cols-2">
              {editing ? <Input label="Commodity" value={`${lot.product.emoji || ''} ${lot.commodityName}`} disabled /> : <ProductSelect label="Commodity" required error={errors.productId?.message} {...register('productId', rules.required('Commodity'))} />}
              <Input label="Variety" disabled={locked} {...register('variety')} />
              <Input label="Grade" disabled={locked} {...register('grade')} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Lot type" options={LOT_TYPES} disabled={locked} {...register('lotType')} />
                {lotType !== 'LOOSE' && <Input label="Bag / crate size" suffix="kg" inputMode="decimal" disabled={locked} error={errors.unitSizeKg?.message} {...register('unitSizeKg', rules.positive('Size'))} />}
              </div>
              <Textarea className="sm:col-span-2" label="Quality and grading notes" rows={2} disabled={locked} {...register('qualityNotes')} />
            </div>
          </Section>
          <Section title="Weight and price">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Total available weight"
                required
                suffix="kg"
                inputMode="decimal"
                disabled={locked}
                hint={reserved > 0 ? `${formatKg(reserved, { grams: false })} already reserved` : undefined}
                error={errors.totalWeightKg?.message}
                {...register('totalWeightKg', { ...rules.positive('Weight'), validate: (v) => (rules.positive('Weight').validate(v) === true ? Number(v) >= reserved || `At least ${reserved} kg (reserved)` : rules.positive('Weight').validate(v)) })}
              />
              <Input label="Price" required suffix="₹/kg" inputMode="decimal" disabled={locked} error={errors.pricePerKg?.message} {...register('pricePerKg', rules.money('Price'))} />
              <Input
                label="Minimum wholesale order"
                required
                suffix="kg"
                inputMode="decimal"
                disabled={locked}
                error={errors.minOrderKg?.message}
                {...register('minOrderKg', { ...rules.positive('Minimum'), validate: (v) => (rules.positive('Minimum').validate(v) === true ? !total || Number(v) <= total || 'Cannot exceed the total' : rules.positive('Minimum').validate(v)) })}
              />
            </div>
          </Section>
          <Section title="Yard and loading">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Market yard name" required disabled={locked} error={errors.marketYardName?.message} {...register('marketYardName', rules.required('Market yard'))} />
              <Input label="Shed / location in yard" disabled={locked} {...register('location')} />
              <Input label="District" disabled={locked} {...register('district')} />
              <Input label="Loading / gate information" placeholder="e.g. Gate 3, loading 6 am – 2 pm" disabled={locked} {...register('loadingInfo')} />
            </div>
          </Section>
        </div>
        <div className="space-y-6">
          <Section title="Photos" description="Up to 5">
            <div className="mb-3 grid grid-cols-3 gap-2">
              {images.map((src) => (
                <div key={src} className="relative">
                  <img src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  {!locked && (
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow"
                      aria-label="Remove photo"
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
            {!locked && images.length < 5 && <FileUpload multiple onFiles={onPhotos} disabled={uploading} label={uploading ? 'Uploading…' : 'Add photos'} />}
          </Section>
          <Section title="Yard location">
            <LocationPicker value={coords} onChange={locked ? () => {} : setCoords} height={240} />
          </Section>
          {!locked && (
            <div className="flex justify-end gap-2">
              {editing ? (
                <Button type="submit" loading={isSubmitting}>
                  Save changes
                </Button>
              ) : (
                <>
                  <Button type="submit" variant="secondary" loading={isSubmitting}>
                    Save draft
                  </Button>
                  <Button onClick={handleSubmit((v) => submit(v, true))} loading={isSubmitting}>
                    Publish lot
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
