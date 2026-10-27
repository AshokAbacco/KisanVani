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

export const CustomerForm = ({ customer, onClose, onSaved }) => {
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
      toast.success(customer ? 'Customer updated' : 'Customer added');
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
      title={customer ? 'Edit customer' : 'Add customer'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            Save
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <Input label="Name" required error={errors.name?.message} {...register('name', rules.name)} />
        <Input label="Mobile" required inputMode="tel" error={errors.mobile?.message} {...register('mobile', rules.mobile)} />
        <Input label="Udhar limit" suffix="₹" inputMode="decimal" hint="Credit bills beyond this are refused" error={errors.creditLimit?.message} {...register('creditLimit', rules.money('Limit', { allowZero: true }))} />
        <Textarea label="Address" rows={2} {...register('address')} />
        <Textarea label="Notes" rows={2} {...register('notes')} />
      </form>
    </Modal>
  );
};

const CustomersPage = () => {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const list = useList((p) => customersApi.list(p), { sortBy: 'name', sortOrder: 'asc' });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Regular customers and their khata. Customers are also added automatically when you enter a mobile number on a bill."
        actions={
          <Button icon={Plus} onClick={() => setAdding(true)}>
            Add customer
          </Button>
        }
      />
      <DataTable
        list={list}
        onRowClick={(c) => navigate(`/shop/customers/${c.id}`)}
        columns={[
          { key: 'name', header: 'Name', sortable: true, render: (c) => <span className="font-medium">{c.name}</span> },
          { key: 'mobile', header: 'Mobile', render: (c) => <span className="num">{c.mobile}</span> },
          { key: 'bills', header: 'Bills', align: 'right', render: (c) => c._count.invoices },
          { key: 'creditBalance', header: 'Udhar due', align: 'right', sortable: true, render: (c) => <span className={Number(c.creditBalance) > 0 ? 'font-semibold text-chilli-600' : ''}>{formatINR(c.creditBalance)}</span> },
          { key: 'creditLimit', header: 'Limit', align: 'right', render: (c) => formatINR(c.creditLimit, { whole: true }) },
          { key: 'createdAt', header: 'Since', sortable: true, render: (c) => formatDate(c.createdAt) },
        ]}
        toolbar={<SearchInput value={list.search} onChange={list.setSearch} placeholder="Name or mobile" className="sm:w-72" />}
        empty={<EmptyState icon={BookUser} title="No customers yet" description="Add a customer, or enter a mobile number on a bill." />}
      />
      {adding && <CustomerForm onClose={() => setAdding(false)} onSaved={list.reload} />}
    </>
  );
};

export default CustomersPage;
