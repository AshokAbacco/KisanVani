import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, FileText, Trash2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section, { DetailList } from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/feedback/Alert';
import { PageLoader } from '../../components/common/Spinner';
import ErrorState from '../../components/feedback/ErrorState';
import { Input, Select } from '../../components/forms/Field';
import FileUpload from '../../components/forms/FileUpload';
import { VehicleForm } from './VehiclesPage';
import useAsync from '../../hooks/useAsync';
import { vehiclesApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatKg, formatDate, humanize } from '../../utils/format';

const DOC_TYPES = [
  { value: 'REGISTRATION', label: 'Registration certificate (RC)' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'FITNESS', label: 'Fitness certificate' },
  { value: 'PERMIT', label: 'Permit' },
  { value: 'POLLUTION', label: 'Pollution (PUC)' },
  { value: 'OTHER', label: 'Other' },
];

const expiryTone = (d) => (!d ? '' : new Date(d) < new Date() ? 'text-red-600 font-semibold' : new Date(d) < new Date(Date.now() + 30 * 86400000) ? 'text-turmeric-700 font-semibold' : '');

const VehicleDetailPage = () => {
  const { id } = useParams();
  const toast = useToast();
  const { data: v, loading, error, reload, setData } = useAsync(() => vehiclesApi.get(id), [id]);
  const [editing, setEditing] = useState(false);
  const [doc, setDoc] = useState({ type: 'REGISTRATION', documentNumber: '', expiryDate: '' });
  const [uploading, setUploading] = useState(false);

  if (loading && !v) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const upload = async (files) => {
    setUploading(true);
    try {
      setData(await vehiclesApi.addDocument(v.id, { type: doc.type, documentNumber: doc.documentNumber || undefined, expiryDate: doc.expiryDate || undefined }, files[0]));
      setDoc({ type: 'REGISTRATION', documentNumber: '', expiryDate: '' });
      toast.success('Document uploaded');
    } catch (e) {
      toast.error(e);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (docId) => {
    try {
      setData(await vehiclesApi.removeDocument(v.id, docId));
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        back={{ to: '/driver/vehicles', label: 'Vehicles' }}
        title={v.registrationNumber}
        description={<span className="inline-flex items-center gap-2">{humanize(v.type)} <StatusBadge status={v.verificationStatus} /></span>}
        actions={
          <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
            Edit details
          </Button>
        }
      />
      {v.verificationStatus === 'REJECTED' && (
        <Alert tone="error" className="mb-6" title="Verification rejected">
          {v.verificationNote} Update the details or documents and an admin will review again.
        </Alert>
      )}
      {v.verificationStatus === 'PENDING' && (
        <Alert tone="info" className="mb-6">
          Waiting for admin verification. Uploading your RC and insurance speeds this up.
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Vehicle">
          <DetailList
            items={[
              ['Make and model', [v.make, v.model].filter(Boolean).join(' ') || '—'],
              ['Capacity', formatKg(v.capacityKg)],
              ['Owner', `${v.ownerName}${v.ownerMobile ? `, ${v.ownerMobile}` : ''}`],
              ['Insurance', <span key="i" className={expiryTone(v.insuranceExpiry)}>{v.insurancePolicyNo || '—'} until {formatDate(v.insuranceExpiry)}</span>],
              ['Fitness certificate', <span key="f" className={expiryTone(v.fitnessExpiry)}>{formatDate(v.fitnessExpiry)}</span>],
              ['Permit', <span key="p" className={expiryTone(v.permitExpiry)}>{v.permitNumber || '—'} until {formatDate(v.permitExpiry)}</span>],
              ['Trips', v._count.trips],
            ]}
          />
        </Section>
        <Section title="Documents">
          <ul className="mb-5 divide-y divide-soil-100">
            {v.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 hover:underline">
                  <FileText className="h-4 w-4 shrink-0 text-soil-400" aria-hidden />
                  <span className="truncate">
                    {DOC_TYPES.find((t) => t.value === d.type)?.label}
                    {d.documentNumber ? ` — ${d.documentNumber}` : ''}
                  </span>
                </a>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  {d.expiryDate && <span className={expiryTone(d.expiryDate)}>until {formatDate(d.expiryDate)}</span>}
                  <StatusBadge status={d.verificationStatus} />
                  {d.verificationStatus !== 'VERIFIED' && <Button size="icon" variant="ghost" icon={Trash2} onClick={() => remove(d.id)} aria-label="Remove document" />}
                </span>
              </li>
            ))}
            {!v.documents.length && <li className="py-3 text-sm text-soil-500">No documents uploaded yet.</li>}
          </ul>
          <div className="space-y-3 rounded-xl bg-leafwhite p-4">
            <p className="text-sm font-semibold">Upload a document</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select label="Type" value={doc.type} onChange={(e) => setDoc({ ...doc, type: e.target.value })} options={DOC_TYPES} />
              <Input label="Number" value={doc.documentNumber} onChange={(e) => setDoc({ ...doc, documentNumber: e.target.value })} />
              <Input label="Valid until" type="date" value={doc.expiryDate} onChange={(e) => setDoc({ ...doc, expiryDate: e.target.value })} />
            </div>
            <FileUpload accept="image/jpeg,image/png,image/webp,application/pdf" onFiles={upload} disabled={uploading} label={uploading ? 'Uploading…' : 'Choose photo or PDF'} />
          </div>
        </Section>
      </div>
      {editing && <VehicleForm vehicle={v} onClose={() => setEditing(false)} onSaved={reload} />}
    </>
  );
};

export default VehicleDetailPage;
