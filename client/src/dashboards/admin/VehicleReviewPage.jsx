import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section, { DetailList } from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import { PageLoader } from '../../components/common/Spinner';
import ErrorState from '../../components/feedback/ErrorState';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import useAsync from '../../hooks/useAsync';
import { vehiclesApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatKg, formatDate, humanize } from '../../utils/format';

/** Admin review of one vehicle and its documents. */
const VehicleReviewPage = () => {
  const { id } = useParams();
  const toast = useToast();
  const { data: v, loading, error, reload, setData } = useAsync(() => vehiclesApi.get(id), [id]);
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading && !v) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const decide = async (status, note) => {
    setBusy(true);
    try {
      setData(await vehiclesApi.verify(v.id, { status, note: note || null }));
      toast.success(status === 'VERIFIED' ? 'Vehicle verified. The driver can take trips.' : 'Vehicle rejected. The driver has been told why.');
      setRejecting(false);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const verifyDoc = async (docId, status) => {
    try {
      setData(await vehiclesApi.verifyDocument(v.id, docId, { status, note: status === 'REJECTED' ? 'Document not acceptable' : null }));
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        back={{ to: '/admin/vehicles', label: 'Vehicles' }}
        title={v.registrationNumber}
        description={<span className="inline-flex items-center gap-2">{humanize(v.type)} <StatusBadge status={v.verificationStatus} /></span>}
        actions={
          <>
            {v.verificationStatus !== 'VERIFIED' && (
              <Button icon={CheckCircle2} onClick={() => decide('VERIFIED')} loading={busy}>
                Verify vehicle
              </Button>
            )}
            {v.verificationStatus !== 'REJECTED' && (
              <Button variant="secondary" icon={XCircle} onClick={() => setRejecting(true)}>
                Reject
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Details">
          <DetailList
            items={[
              ['Driver', <Link key="d" className="link" to={`/admin/users/${v.driver.id}`}>{v.driver.name}</Link>],
              ['Driver mobile', v.driver.mobile],
              ['Owner', `${v.ownerName}${v.ownerMobile ? `, ${v.ownerMobile}` : ''}`],
              ['Make and model', [v.make, v.model].filter(Boolean).join(' ') || '—'],
              ['Capacity', formatKg(v.capacityKg)],
              ['Insurance', `${v.insurancePolicyNo || '—'} until ${formatDate(v.insuranceExpiry)}`],
              ['Fitness', formatDate(v.fitnessExpiry)],
              ['Permit', `${v.permitNumber || '—'} until ${formatDate(v.permitExpiry)}`],
              ['Trips', v._count.trips],
              v.verificationNote && ['Last note', v.verificationNote],
            ]}
          />
        </Section>
        <Section title="Documents">
          <ul className="divide-y divide-soil-100">
            {v.documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" aria-hidden />
                  {humanize(d.type)}
                  {d.documentNumber ? ` — ${d.documentNumber}` : ''}
                </a>
                <span className="flex items-center gap-2 text-sm">
                  {d.expiryDate && <span className="text-soil-500">until {formatDate(d.expiryDate)}</span>}
                  <StatusBadge status={d.verificationStatus} />
                  {d.verificationStatus === 'PENDING' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => verifyDoc(d.id, 'VERIFIED')}>
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => verifyDoc(d.id, 'REJECTED')}>
                        Reject
                      </Button>
                    </>
                  )}
                </span>
              </li>
            ))}
            {!v.documents.length && <li className="py-6 text-sm text-soil-500">The driver has not uploaded documents yet.</li>}
          </ul>
        </Section>
      </div>
      <ConfirmDialog open={rejecting} onClose={() => setRejecting(false)} title="Reject this vehicle?" message="Tell the driver what to fix — the note is sent to them." confirmLabel="Reject vehicle" requireReason reasonLabel="What needs fixing" busy={busy} onConfirm={(note) => decide('REJECTED', note)} />
    </>
  );
};

export default VehicleReviewPage;
