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
import { formatDate, timeAgo } from '../../utils/format';
import { rules } from '../../validators';
import { applyFieldErrors } from '../../utils/errors';

const orgName = (u) => u.shopProfile?.shopName || u.mandiProfile?.mandiName || u.farmerProfile?.farmName || (u.driverProfile ? `Licence ${u.driverProfile.licenseNumber}` : '');
const place = (u) => (u.shopProfile || u.mandiProfile || u.farmerProfile)?.address?.district || (u.farmerProfile?.address?.village ?? '');

const CreateUser = ({ onClose, onCreated, defaultRole }) => {
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
      toast.success(`${roleLabel(u.role)} account created for ${u.name}`);
      onCreated(u);
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Create an account"
      description="Accounts created by an admin are active immediately. Share the password securely; the user should change it after first sign-in."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            Create account
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)} noValidate>
        <Select label="Role" options={Object.values(ROLES).map((r) => ({ value: r.key, label: r.label }))} {...register('role')} />
        <Input label="Full name" required error={errors.name?.message} {...register('name', rules.name)} />
        <Input label="Mobile" required inputMode="tel" error={errors.mobile?.message} {...register('mobile', rules.mobile)} />
        <Input label="E-mail" required={role === 'ADMIN'} type="email" error={errors.email?.message} {...register('email', { ...rules.email, ...(role === 'ADMIN' ? { required: 'E-mail is required for admins' } : {}) })} />
        {['SHOPKEEPER', 'MANDI_OWNER', 'FARMER'].includes(role) && (
          <Input label={{ SHOPKEEPER: 'Shop name', MANDI_OWNER: 'Mandi name', FARMER: 'Farm name' }[role]} required={role !== 'FARMER'} error={errors.orgName?.message || errors.shopName?.message || errors.mandiName?.message} {...register('orgName', role !== 'FARMER' ? rules.required('Name') : {})} />
        )}
        {role === 'DRIVER' && <Input label="Driving licence" required error={errors.licenseNumber?.message} {...register('licenseNumber', rules.required('Licence'))} />}
        <Input label="Temporary password" type="password" required autoComplete="new-password" error={errors.password?.message} {...register('password', rules.password)} />
      </form>
    </Modal>
  );
};

/** User management. With `role` it becomes the Farmers / Shopkeepers / Mandi owners / Drivers screen. */
const UsersPage = ({ role, title = 'Users & roles', description = 'Every account on the platform. Open one to change its status or see its activity.' }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const list = useList((p) => adminApi.users(p), { initialFilters: { role: role || '', status: params.get('status') || '' } });

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={() => reportsApi.export({ dataset: 'users' })}>
              Export CSV
            </Button>
            <Button icon={UserPlus} onClick={() => setCreating(true)}>
              Create account
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
            header: 'Name',
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
          !role && { key: 'role', header: 'Role', render: (u) => roleLabel(u.role) },
          { key: 'contact', header: 'Contact', render: (u) => <span className="text-soil-600">{u.mobile}{u.email && <span className="block text-xs text-soil-400">{u.email}</span>}</span> },
          { key: 'place', header: 'District', render: (u) => place(u) || '—' },
          { key: 'status', header: 'Status', sortable: true, render: (u) => <StatusBadge status={u.status} /> },
          { key: 'lastLoginAt', header: 'Last sign-in', sortable: true, render: (u) => <span className="text-soil-500">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</span> },
          { key: 'createdAt', header: 'Joined', sortable: true, render: (u) => formatDate(u.createdAt) },
        ].filter(Boolean)}
        toolbar={
          <>
            <div className="flex flex-wrap gap-2">
              {!role && (
                <select className="input h-10 w-auto py-1" aria-label="Role" value={list.filters.role} onChange={(e) => list.setFilters({ role: e.target.value })}>
                  <option value="">All roles</option>
                  {Object.values(ROLES).map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.shortLabel || r.label}
                    </option>
                  ))}
                </select>
              )}
              <select className="input h-10 w-auto py-1" aria-label="Status" value={list.filters.status} onChange={(e) => list.setFilters({ status: e.target.value })}>
                <option value="">Any status</option>
                <option value="PENDING_APPROVAL">Awaiting approval</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DEACTIVATED">Deactivated</option>
              </select>
            </div>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Name, mobile, e-mail or business" className="sm:w-72" />
          </>
        }
        empty={<EmptyState icon={Users} title="No users match" description="Change the filters or search." />}
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