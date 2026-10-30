import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { UserPlus, Users, Download } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Avatar from '../../components/common/Avatar';
import Modal from '../../components/modals/Modal';
import { Input, Select } from '../../components/forms/Field';
import useList from '../../hooks/useList';
import { adminApi, reportsApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { ROLES, roleLabel } from '../../constants/roles';
import { formatDate, timeAgo, humanize } from '../../utils/format';
import { rules } from '../../validators';
import { applyFieldErrors } from '../../utils/errors';
import { translate, useI18n } from '../../i18n';

const orgName = (u) => u.shopProfile?.shopName || u.mandiProfile?.mandiName || u.farmerProfile?.farmName || (u.driverProfile ? translate('layout.licence', '', { number: u.driverProfile.licenseNumber }) : '');
const place = (u) => (u.shopProfile || u.mandiProfile || u.farmerProfile)?.address?.district || (u.farmerProfile?.address?.village ?? '');

const CreateUser = ({ onClose, onCreated, defaultRole }) => {
  const { t } = useI18n();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { role: defaultRole || 'FARMER' } });
  const role = watch('role');
  const submit = async (v) => {
    const body = { role: v.role, name: v.name, mobile: v.mobile, email: v.email || (v.role === 'ADMIN' ? undefined : null), password: v.password };
    if (v.role === 'SHOPKEEPER') body.shopName = v.orgName;
    if (v.role === 'FARMER') body.farmName = v.orgName || null;
    if (v.role === 'MANDI_OWNER') body.mandiName = v.orgName;
    if (v.role === 'DRIVER') body.licenseNumber = v.licenseNumber;
    try {
      const u = await adminApi.createUser(body);
      toast.success(t('users.createdToast', '', { role: roleLabel(u.role), name: u.name }));
      onCreated(u);
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t('users.createTitle')}
      description={t('users.createIntro')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {t('users.createAccount')}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)} noValidate>
        <Select label={t('common.role')} options={Object.values(ROLES).map((r) => ({ value: r.key, label: r.label }))} {...register('role')} />
        <Input label={t('users.fullName')} required error={errors.name?.message} {...register('name', rules.name)} />
        <Input label={t('common.mobile')} required inputMode="tel" error={errors.mobile?.message} {...register('mobile', rules.mobile)} />
        <Input label={t('common.email')} required={role === 'ADMIN'} type="email" error={errors.email?.message} {...register('email', { ...rules.email, ...(role === 'ADMIN' ? { required: t('users.emailRequiredAdmin') } : {}) })} />
        {['SHOPKEEPER', 'MANDI_OWNER', 'FARMER'].includes(role) && (
          <Input label={t(`users.orgName.${role}`)} required={role !== 'FARMER'} error={errors.orgName?.message || errors.shopName?.message || errors.mandiName?.message} {...register('orgName', role !== 'FARMER' ? rules.required(t('common.name')) : {})} />
        )}
        {role === 'DRIVER' && <Input label={t('users.drivingLicence')} required error={errors.licenseNumber?.message} {...register('licenseNumber', rules.required(t('users.licence')))} />}
        <Input label={t('users.tempPassword')} type="password" required autoComplete="new-password" error={errors.password?.message} {...register('password', rules.password)} />
      </form>
    </Modal>
  );
};

/** User management. With `role` it becomes the Farmers / Shopkeepers / Mandi owners / Drivers screen. */
const UsersPage = ({ role, copy = 'routes.users' }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const list = useList((p) => adminApi.users(p), { initialFilters: { role: role || '', status: params.get('status') || '' } });

  return (
    <>
      <PageHeader
        title={t(`${copy}.title`)}
        description={t(`${copy}.description`)}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={() => reportsApi.export({ dataset: 'users' })}>
              {t('common.export')}
            </Button>
            <Button icon={UserPlus} onClick={() => setCreating(true)}>
              {t('users.createAccount')}
            </Button>
          </>
        }
      />
      <DataTable
        list={list}
        onRowClick={(u) => navigate(`/admin/users/${u.id}`)}
        columns={[
          {
            key: 'name',
            header: t('common.name'),
            sortable: true,
            render: (u) => (
              <span className="flex items-center gap-3">
                <Avatar name={u.name} src={u.avatarUrl} size="h-8 w-8" />
                <span>
                  <span className="font-medium">{u.name}</span>
                  <span className="block text-xs text-soil-500">{orgName(u)}</span>
                </span>
              </span>
            ),
          },
          !role && { key: 'role', header: t('common.role'), render: (u) => roleLabel(u.role) },
          { key: 'contact', header: t('common.contact'), render: (u) => <span className="text-soil-600">{u.mobile}{u.email && <span className="block text-xs text-soil-400">{u.email}</span>}</span> },
          { key: 'place', header: t('common.district'), render: (u) => place(u) || '—' },
          { key: 'status', header: t('common.status'), sortable: true, render: (u) => <StatusBadge status={u.status} /> },
          { key: 'lastLoginAt', header: t('users.lastSignIn'), sortable: true, render: (u) => <span className="text-soil-500">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : t('users.never')}</span> },
          { key: 'createdAt', header: t('users.joined'), sortable: true, render: (u) => formatDate(u.createdAt) },
        ].filter(Boolean)}
        toolbar={
          <>
            <div className="flex flex-wrap gap-2">
              {!role && (
                <select className="input h-10 w-auto py-1" aria-label={t('common.role')} value={list.filters.role} onChange={(e) => list.setFilters({ role: e.target.value })}>
                  <option value="">{t('users.allRoles')}</option>
                  {Object.values(ROLES).map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.shortLabel || r.label}
                    </option>
                  ))}
                </select>
              )}
              <select className="input h-10 w-auto py-1" aria-label={t('common.status')} value={list.filters.status} onChange={(e) => list.setFilters({ status: e.target.value })}>
                <option value="">{t('users.anyStatus')}</option>
                <option value="PENDING_APPROVAL">{t('users.awaitingApproval')}</option>
                {['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </select>
            </div>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('users.searchPlaceholder')} className="sm:w-72" />
          </>
        }
        empty={<EmptyState icon={Users} title={t('users.emptyTitle')} description={t('users.emptyBody')} />}
      />
      {creating && (
        <CreateUser
          defaultRole={role}
          onClose={() => setCreating(false)}
          onCreated={(u) => {
            setCreating(false);
            navigate(`/admin/users/${u.id}`);
          }}
        />
      )}
    </>
  );
};

export default UsersPage;