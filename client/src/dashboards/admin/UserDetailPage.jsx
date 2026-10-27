import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, PauseCircle, Power, LogOut, Pencil } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section, { DetailList } from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Avatar from '../../components/common/Avatar';
import Alert from '../../components/feedback/Alert';
import { PageLoader } from '../../components/common/Spinner';
import ErrorState from '../../components/feedback/ErrorState';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import Modal from '../../components/modals/Modal';
import { Input } from '../../components/forms/Field';
import { Timeline } from '../../components/common/Stepper';
import useAsync from '../../hooks/useAsync';
import { adminApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { roleLabel } from '../../constants/roles';
import { formatDate, formatDateTime, humanize } from '../../utils/format';

const ACTIVITY_LABELS = {
  totalSales: 'POS sales',
  invoices: 'Bills',
  procurementOrders: 'Orders placed',
  stockItems: 'Products stocked',
  listings: 'Harvest listings',
  ordersReceived: 'Orders received',
  earnings: 'Settled earnings',
  lots: 'Mandi lots',
  wholesaleOrders: 'Wholesale orders',
  farmerProcurementOrders: 'Farmer purchases',
  trips: 'Trips',
  deliveredTrips: 'Delivered trips',
  auditEntries: 'Audit entries',
};

const UserDetailPage = () => {
  const { id } = useParams();
  const { user: me } = useAuth();
  const toast = useToast();
  const { data: u, loading, error, reload } = useAsync(() => adminApi.user(id), [id]);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  if (loading && !u) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const profile = u.shopProfile || u.farmerProfile || u.mandiProfile || u.driverProfile;
  const addr = profile?.address;
  const self = u.id === me.id;

  const run = async (reason) => {
    setBusy(true);
    try {
      if (action.status) await adminApi.setStatus(u.id, { status: action.status, reason: reason || null });
      else await adminApi.revokeSessions(u.id);
      toast.success(action.done);
      setAction(null);
      reload();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      await adminApi.updateUser(u.id, { name: form.name, email: form.email || null, mobile: form.mobile });
      toast.success('User updated');
      setEditing(false);
      reload();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const activityItems = Object.entries(u.activity || {})
    .filter(([k]) => k !== 'vehicles')
    .map(([k, v]) => [ACTIVITY_LABELS[k] || humanize(k), ['totalSales', 'earnings'].includes(k) ? `₹${Number(v).toLocaleString('en-IN')}` : v]);

  return (
    <>
      <PageHeader
        back={{ to: '/admin/users', label: 'Users' }}
        title={u.name}
        description={<span className="inline-flex items-center gap-2">{roleLabel(u.role)} <StatusBadge status={u.status} /></span>}
        actions={
          !self && (
            <>
              <Button
                variant="secondary"
                icon={Pencil}
                onClick={() => {
                  setForm({ name: u.name, email: u.email || '', mobile: u.mobile });
                  setEditing(true);
                }}
              >
                Edit
              </Button>
              {u.status !== 'ACTIVE' && (
                <Button icon={CheckCircle2} onClick={() => setAction({ status: 'ACTIVE', title: u.status === 'PENDING_APPROVAL' ? 'Approve this account?' : 'Reactivate this account?', label: u.status === 'PENDING_APPROVAL' ? 'Approve' : 'Activate', done: 'Account activated', tone: 'primary' })}>
                  {u.status === 'PENDING_APPROVAL' ? 'Approve' : 'Activate'}
                </Button>
              )}
              {u.status === 'ACTIVE' && (
                <Button variant="secondary" icon={PauseCircle} onClick={() => setAction({ status: 'SUSPENDED', title: 'Suspend this account?', label: 'Suspend', done: 'Account suspended', reason: true, message: 'The user is signed out everywhere and cannot sign in until reactivated.' })}>
                  Suspend
                </Button>
              )}
              {u.status !== 'DEACTIVATED' && (
                <Button variant="ghost" icon={Power} onClick={() => setAction({ status: 'DEACTIVATED', title: 'Deactivate this account?', label: 'Deactivate', done: 'Account deactivated', reason: true, message: 'Use for accounts that have left the platform. Records are kept for audit.' })}>
                  Deactivate
                </Button>
              )}
              <Button variant="ghost" icon={LogOut} onClick={() => setAction({ title: 'Sign this user out everywhere?', label: 'Sign out', done: 'Sessions revoked', tone: 'primary', message: `${u.activeSessions} active session(s) will be ended.` })}>
                Sign out
              </Button>
            </>
          )
        }
      />
      {self && <Alert tone="info" className="mb-6">This is your own account. Manage it from Account settings.</Alert>}
      {u.status === 'PENDING_APPROVAL' && (
        <Alert tone="warning" className="mb-6" title="Waiting for approval">
          Check the details below before approving. {u.role === 'DRIVER' && 'Vehicles are verified separately under Vehicles.'}
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Section>
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={u.name} src={u.avatarUrl} size="h-14 w-14" />
              <div>
                <p className="font-display text-lg font-semibold">{u.name}</p>
                <p className="text-sm text-soil-500">Joined {formatDate(u.createdAt)}</p>
              </div>
            </div>
            <DetailList
              items={[
                ['Mobile', u.mobile],
                ['E-mail', u.email],
                ['Last sign-in', formatDateTime(u.lastLoginAt)],
                ['Language', u.preferredLanguage],
                u.shopProfile && ['Shop', `${u.shopProfile.shopName} (${u.shopProfile.shopCode})`],
                u.shopProfile?.gstin && ['GSTIN', u.shopProfile.gstin],
                u.farmerProfile && ['Farm', u.farmerProfile.farmName],
                u.farmerProfile && ['Crops', u.farmerProfile.primaryCrops?.join(', ')],
                u.mandiProfile && ['Mandi', u.mandiProfile.mandiName],
                u.mandiProfile && ['Yard', u.mandiProfile.marketYardName],
                u.mandiProfile && ['APMC licence', u.mandiProfile.licenseNumber],
                u.mandiProfile && ['Commission', `${Number(u.mandiProfile.commissionPercent)}%`],
                u.driverProfile && ['Driving licence', u.driverProfile.licenseNumber],
                u.driverProfile && ['Licence valid until', formatDate(u.driverProfile.licenseExpiry)],
                addr && ['Address', [addr.line1, addr.village, addr.city, addr.district, addr.state, addr.pincode].filter(Boolean).join(', ')],
              ]}
            />
          </Section>
          <Section title="Activity">
            <DetailList items={activityItems} />
            {u.activity?.vehicles?.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-soil-200 pt-4">
                {u.activity.vehicles.map((v) => (
                  <li key={v.id} className="flex items-center justify-between text-sm">
                    <Link to={`/admin/vehicles/${v.id}`} className="link num">
                      {v.registrationNumber}
                    </Link>
                    <StatusBadge status={v.verificationStatus} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
        <Section title="Audit trail" description="Actions by or about this user">
          {u.auditTrail.length ? (
            <Timeline items={u.auditTrail.map((a) => ({ id: a.id, title: humanize(a.action), meta: `${formatDateTime(a.createdAt)} — by ${a.actor?.name || 'system'}`, note: a.metadata?.reason }))} />
          ) : (
            <p className="text-sm text-soil-500">No recorded activity.</p>
          )}
        </Section>
      </div>
      <ConfirmDialog open={!!action} onClose={() => setAction(null)} title={action?.title} message={action?.message} confirmLabel={action?.label} tone={action?.tone || 'danger'} requireReason={action?.reason} busy={busy} onConfirm={run} />
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit user"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={busy}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Mobile" value={form.mobile || ''} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <Input label="E-mail" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </Modal>
    </>
  );
};

export default UserDetailPage;
