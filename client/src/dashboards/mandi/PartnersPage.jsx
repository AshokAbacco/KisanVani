import { Handshake, Phone } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import EmptyState from '../../components/common/EmptyState';
import useAsync from '../../hooks/useAsync';
import { mandiApi } from '../../services';
import { roleLabel } from '../../constants/roles';
import { formatINR, formatDate } from '../../utils/format';

/** Farmers and shops this mandi has traded with. */
const PartnersPage = () => {
  const { data, loading, error, reload } = useAsync(() => mandiApi.partners(), []);
  return (
    <>
      <PageHeader title="Partners" description="Farmers who sell to you and shops who buy from you, ranked by trade value." />
      <DataTable
        list={{ items: data || [], loading, error, reload, meta: null }}
        columns={[
          { key: 'name', header: 'Partner', render: (p) => <span className="font-medium">{p.name}</span> },
          { key: 'role', header: 'Role', render: (p) => roleLabel(p.role) },
          { key: 'mobile', header: 'Contact', render: (p) => <a className="link inline-flex items-center gap-1" href={`tel:${p.mobile}`}><Phone className="h-3.5 w-3.5" aria-hidden /> {p.mobile}</a> },
          { key: 'orders', header: 'Orders', align: 'right' },
          { key: 'value', header: 'Trade value', align: 'right', render: (p) => <span className="font-semibold">{formatINR(p.value)}</span> },
          { key: 'lastOrderAt', header: 'Last order', render: (p) => formatDate(p.lastOrderAt) },
        ]}
        empty={<EmptyState icon={Handshake} title="No partners yet" description="Partners appear after your first order with a farmer or shop." />}
      />
    </>
  );
};

export default PartnersPage;
