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

/** Create or edit a harvest listing, including photos and the farm's GPS position. */
const ListingFormPage = () => {
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
        toast.success('Listing updated');
      } else {
        const created = await farmerApi.create({ ...body, productId: v.productId, publish });
        if (pendingFiles.length) {
          try {
            await uploadImages(created.id, pendingFiles.map((p) => p.file));
          } catch (e) {
            toast.error(`Listing saved, but photos failed: ${e.response?.data?.error?.message || e.message}`);
          }
        }
        toast.success(publish ? 'Harvest published. Buyers can order it now.' : 'Saved as draft');
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
        toast.success('Photos added');
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
        back={{ to: '/farmer/listings', label: 'Harvest listings' }}
        title={editing ? `Edit ${listing.cropName}` : 'Post new harvest'}
        description={editing ? <span className="inline-flex items-center gap-2">Status <StatusBadge status={listing.status} /></span> : 'Fill in what you have to sell. You can save a draft and publish later.'}
      />
      {locked && <Alert tone="info" className="mb-6">This listing is completed and can no longer be edited.</Alert>}
      <form noValidate className="grid gap-6 xl:grid-cols-[1.4fr_1fr]" onSubmit={handleSubmit((v) => submit(v, false))}>
        <div className="space-y-6">
          <Section title="Crop">
            <div className="grid gap-4 sm:grid-cols-2">
              {editing ? (
                <Input label="Crop" value={`${listing.product.emoji || ''} ${listing.cropName}`} disabled hint="The crop cannot be changed after posting" />
              ) : (
                <ProductSelect label="Crop" required error={errors.productId?.message} {...register('productId', rules.required('Crop'))} />
              )}
              <Input label="Harvest date and time" type="datetime-local" required error={errors.harvestAt?.message} disabled={locked} {...register('harvestAt', rules.required('Harvest date'))} />
              <Input label="Variety" placeholder="e.g. Arka Rakshak" disabled={locked} {...register('variety')} />
              <Input label="Grade" placeholder="e.g. A, Premium" disabled={locked} {...register('grade')} />
              <Textarea className="sm:col-span-2" label="Description" rows={3} disabled={locked} {...register('description')} />
              <Input className="sm:col-span-2" label="Freshness notes" placeholder="e.g. Picked this morning, kept in shade" disabled={locked} {...register('freshnessNotes')} />
            </div>
          </Section>
          <Section title="Quantity and price">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Total quantity"
                required
                suffix="kg"
                inputMode="decimal"
                disabled={locked}
                hint={editing && ordered > 0 ? `${formatKg(ordered, { grams: false })} already ordered` : undefined}
                error={errors.totalQuantityKg?.message}
                {...register('totalQuantityKg', { ...rules.positive('Quantity'), validate: (v) => (rules.positive('Quantity').validate(v) === true ? Number(v) >= ordered || `At least ${ordered} kg (already ordered)` : rules.positive('Quantity').validate(v)) })}
              />
              <Input label="Price" required suffix="₹/kg" inputMode="decimal" disabled={locked} error={errors.pricePerKg?.message} {...register('pricePerKg', rules.money('Price'))} />
              <Input
                label="Minimum order"
                required
                suffix="kg"
                inputMode="decimal"
                disabled={locked}
                error={errors.minOrderKg?.message}
                {...register('minOrderKg', { ...rules.positive('Minimum order'), validate: (v) => (rules.positive('Minimum order').validate(v) === true ? !total || Number(v) <= total || 'Cannot exceed the total' : rules.positive('Minimum order').validate(v)) })}
              />
            </div>
            {editing && <p className="mt-3 text-sm text-soil-500">Changing the price affects new orders only. Existing orders keep the price they were placed at.</p>}
          </Section>
        </div>
        <div className="space-y-6">
          <Section title="Photos" description="Up to 5. Clear photos get more orders.">
            <div className="mb-3 grid grid-cols-3 gap-2">
              {(editing ? listing.images : pendingFiles.map((p) => p.url)).map((src) => (
                <div key={src} className="relative">
                  <img src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => (editing ? removePhoto(src) : setPendingFiles((f) => f.filter((x) => x.url !== src)))}
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!locked && (editing ? listing.images.length : pendingFiles.length) < 5 && <FileUpload multiple onFiles={onPhotos} disabled={uploading} label={uploading ? 'Uploading…' : 'Add photos'} />}
          </Section>
          <Section title="Farm location">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Input label="Village" disabled={locked} {...register('village')} />
              <Input label="District" disabled={locked} {...register('district')} />
            </div>
            <LocationPicker value={coords} onChange={locked ? () => {} : setCoords} height={220} />
          </Section>
          {!locked && (
            <div className="flex flex-wrap justify-end gap-2">
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
                    Publish harvest
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
