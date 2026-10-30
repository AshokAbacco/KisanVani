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
import useAsync from '../../hooks/useAsync';
import { adminApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { roleLabel } from '../../constants/roles';
import { formatDate, formatDateTime, humanize } from '../../utils/format';
import { LANGUAGES, useI18n } from '../../i18n';

/** Activity counters with a label in userDetail.activity.<key>; others fall back to humanize(). */
const ACTIVITY_KEYS = ['totalSales', 'invoices', 'procurementOrders', 'stockItems', 'listings', 'ordersReceived', 'earnings', 'lots', 'wholesaleOrders', 'farmerProcurementOrders', 'trips', 'deliveredTrips'];

/* Status actions; their texts come from userDetail.actions.<key>. */
const ACTIONS = {
  approve: { status: 'ACTIVE', tone: 'primary' },
  activate: { status: 'ACTIVE', tone: 'primary' },
  suspend: { status: 'SUSPENDED', reason: true },
  deactivate: { status: 'DEACTIVATED', reason: true },
  signOut: { tone: 'primary' },
};

const UserDetailPage = () => {
  const { t } = useI18n();
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
      toast.success(t(`userDetail.actions.${action.key}.done`));
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
      toast.success(t('userDetail.updated'));
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
    .map(([k, v]) => [ACTIVITY_KEYS.includes(k) ? t(`userDetail.activity.${k}`) : humanize(k), ['totalSales', 'earnings'].includes(k) ? `₹${Number(v).toLocaleString('en-IN')}` : v]);
  const open = (key) => setAction({ key, ...ACTIONS[key] });

  return (
    <>
      <PageHeader
        back={{ to: '/admin/users', label: t('dnav.items.users') }}
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
                {t('common.edit')}
              </Button>
              {u.status !== 'ACTIVE' && (
                <Button icon={CheckCircle2} onClick={() => open(u.status === 'PENDING_APPROVAL' ? 'approve' : 'activate')}>
                  {t(u.status === 'PENDING_APPROVAL' ? 'userDetail.actions.approve.label' : 'userDetail.actions.activate.label')}
                </Button>
              )}
              {u.status === 'ACTIVE' && (
                <Button variant="secondary" icon={PauseCircle} onClick={() => open('suspend')}>
                  {t('userDetail.actions.suspend.label')}
                </Button>
              )}
              {u.status !== 'DEACTIVATED' && (
                <Button variant="ghost" icon={Power} onClick={() => open('deactivate')}>
                  {t('userDetail.actions.deactivate.label')}
                </Button>
              )}
              <Button variant="ghost" icon={LogOut} onClick={() => open('signOut')}>
                {t('userDetail.actions.signOut.label')}
              </Button>
            </>
          )
        }
      />
      {self && <Alert tone="info" className="mb-6">{t('userDetail.ownAccount')}</Alert>}
      {u.status === 'PENDING_APPROVAL' && (
        <Alert tone="warning" className="mb-6" title={t('userDetail.waitingTitle')}>
          {t('userDetail.waitingBody')} {u.role === 'DRIVER' && t('userDetail.vehiclesSeparate')}
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Section>
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={u.name} src={u.avatarUrl} size="h-14 w-14" />
              <div>
                <p className="font-display text-lg font-semibold">{u.name}</p>
                <p className="text-sm text-soil-500">{t('userDetail.joinedOn', '', { date: formatDate(u.createdAt) })}</p>
              </div>
            </div>
            <DetailList
              items={[
                [t('common.mobile'), u.mobile],
                [t('common.email'), u.email],
                [t('users.lastSignIn'), formatDateTime(u.lastLoginAt)],
                [t('common.language'), LANGUAGES.find((l) => l.code === u.preferredLanguage)?.native || u.preferredLanguage],
                u.shopProfile && [t('shopGps.shop'), `${u.shopProfile.shopName} (${u.shopProfile.shopCode})`],
                u.shopProfile?.gstin && ['GSTIN', u.shopProfile.gstin],
                u.farmerProfile && [t('userDetail.farm'), u.farmerProfile.farmName],
                u.farmerProfile && [t('userDetail.crops'), u.farmerProfile.primaryCrops?.join(', ')],
                u.mandiProfile && [t('enums.MANDI'), u.mandiProfile.mandiName],
                u.mandiProfile && [t('lots.yard'), u.mandiProfile.marketYardName],
                u.mandiProfile && [t('userDetail.apmcLicence'), u.mandiProfile.licenseNumber],
                u.mandiProfile && [t('userDetail.commission'), `${Number(u.mandiProfile.commissionPercent)}%`],
                u.driverProfile && [t('users.drivingLicence'), u.driverProfile.licenseNumber],
                u.driverProfile && [t('userDetail.licenceValid'), formatDate(u.driverProfile.licenseExpiry)],
                addr && [t('common.address'), [addr.line1, addr.village, addr.city, addr.district, addr.state, addr.pincode].filter(Boolean).join(', ')],
              ]}
            />
          </Section>
          <Section title={t('userDetail.activityTitle')}>
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
      </div>
      <ConfirmDialog
        open={!!action}
        onClose={() => setAction(null)}
        title={action && t(`userDetail.actions.${action.key}.title`)}
        message={action && t(`userDetail.actions.${action.key}.message`, '', { n: u.activeSessions })}
        confirmLabel={action && t(`userDetail.actions.${action.key}.label`)}
        tone={action?.tone || 'danger'}
        requireReason={action?.reason}
        busy={busy}
        onConfirm={run}
      />
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title={t('userDetail.editUser')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveEdit} loading={busy}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label={t('common.name')} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label={t('common.mobile')} value={form.mobile || ''} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <Input label={t('common.email')} value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </Modal>
    </>
  );
};

export default UserDetailPage;
