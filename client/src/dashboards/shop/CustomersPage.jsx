import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Plus, BookUser } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/modals/Modal';
import { Input, Textarea } from '../../components/forms/Field';
import useList from '../../hooks/useList';
import { customersApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/format';
import { rules } from '../../validators';
import { applyFieldErrors } from '../../utils/errors';
import { useI18n } from '../../i18n';

export const CustomerForm = ({ customer, onClose, onSaved }) => {
  const { t } = useI18n();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: customer ? { name: customer.name, mobile: customer.mobile, address: customer.address || '', creditLimit: String(Number(customer.creditLimit)), notes: customer.notes || '' } : { creditLimit: '5000' } });

  const submit = async (v) => {
    try {
      const body = { name: v.name, mobile: v.mobile, address: v.address || null, creditLimit: v.creditLimit, notes: v.notes || null };
      const saved = customer ? await customersApi.update(customer.id, body) : await customersApi.create(body);
      toast.success(t(customer ? 'customers.updated' : 'customers.added'));
      onSaved(saved);
      onClose();
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t(customer ? 'customers.edit' : 'customers.add')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <Input label={t('common.name')} required error={errors.name?.message} {...register('name', rules.name)} />
        <Input label={t('common.mobile')} required inputMode="tel" error={errors.mobile?.message} {...register('mobile', rules.mobile)} />
        <Input label={t('customers.udharLimit')} suffix="₹" inputMode="decimal" hint={t('customers.limitHint')} error={errors.creditLimit?.message} {...register('creditLimit', rules.money(t('customers.limit'), { allowZero: true }))} />
        <Textarea label={t('common.address')} rows={2} {...register('address')} />
        <Textarea label={t('common.notes')} rows={2} {...register('notes')} />
      </form>
    </Modal>
  );
};

const CustomersPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const list = useList((p) => customersApi.list(p), { sortBy: 'name', sortOrder: 'asc' });

  return (
    <>
      <PageHeader
        title={t('customers.title')}
        description={t('customers.intro')}
        actions={
          <Button icon={Plus} onClick={() => setAdding(true)}>
            {t('customers.add')}
          </Button>
        }
      />
      <DataTable
        list={list}
        onRowClick={(c) => navigate(`/shop/customers/${c.id}`)}
        columns={[
          { key: 'name', header: t('common.name'), sortable: true, render: (c) => <span className="font-medium">{c.name}</span> },
          { key: 'mobile', header: t('common.mobile'), render: (c) => <span className="num">{c.mobile}</span> },
          { key: 'bills', header: t('customers.bills'), align: 'right', render: (c) => c._count.invoices },
          { key: 'creditBalance', header: t('customers.udharDue'), align: 'right', sortable: true, render: (c) => <span className={Number(c.creditBalance) > 0 ? 'font-semibold text-chilli-600' : ''}>{formatINR(c.creditBalance)}</span> },
          { key: 'creditLimit', header: t('customers.limit'), align: 'right', render: (c) => formatINR(c.creditLimit, { whole: true }) },
          { key: 'createdAt', header: t('customers.since'), sortable: true, render: (c) => formatDate(c.createdAt) },
        ]}
        toolbar={<SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.nameOrMobile')} className="sm:w-72" />}
        empty={<EmptyState icon={BookUser} title={t('customers.emptyTitle')} description={t('customers.emptyBody')} />}
      />
      {adding && <CustomerForm onClose={() => setAdding(false)} onSaved={list.reload} />}
    </>
  );
};

export default CustomersPage;
