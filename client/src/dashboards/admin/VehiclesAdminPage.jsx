import { useNavigate, useSearchParams } from 'react-router-dom';
import { Car } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Tabs from '../../components/common/Tabs';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import useList from '../../hooks/useList';
import { vehiclesApi } from '../../services';
import { formatKg, formatDate, humanize } from '../../utils/format';

const VehiclesAdminPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const list = useList((p) => vehiclesApi.list(p), { initialFilters: { verificationStatus: params.get('verificationStatus') || '', type: '' } });
  const expired = (d) => d && new Date(d) < new Date();
  return (
    <>
      <PageHeader title="Vehicles" description="Verify vehicles before they can carry loads. Drivers are notified of your decision." />
      <DataTable
        list={list}
        onRowClick={(v) => navigate(`/admin/vehicles/${v.id}`)}
        columns={[
          { key: 'registrationNumber', header: 'Registration', sortable: true, render: (v) => <span className="num whitespace-nowrap font-semibold">{v.registrationNumber}</span> },
          { key: 'type', header: 'Type', render: (v) => humanize(v.type) },
          { key: 'capacityKg', header: 'Capacity', align: 'right', sortable: true, render: (v) => formatKg(v.capacityKg) },
          { key: 'driver', header: 'Driver', render: (v) => `${v.driver.name} (${v.driver.mobile})` },
          { key: 'docs', header: 'Documents', align: 'right', render: (v) => v.documents.length },
          { key: 'insurance', header: 'Insurance until', render: (v) => <span className={expired(v.insuranceExpiry) ? 'font-semibold text-red-600' : ''}>{formatDate(v.insuranceExpiry)}</span> },
          { key: 'verificationStatus', header: 'Verification', render: (v) => <StatusBadge status={v.verificationStatus} /> },
        ]}
        toolbar={
          <>
            <Tabs
              value={list.filters.verificationStatus}
              onChange={(verificationStatus) => list.setFilters({ verificationStatus })}
              tabs={[
                { value: '', label: 'All' },
                { value: 'PENDING', label: 'To verify' },
                { value: 'VERIFIED', label: 'Verified' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Registration, owner or driver" className="sm:w-72" />
          </>
        }
        empty={<EmptyState icon={Car} title="No vehicles match" />}
      />
    </>
  );
};

export default VehiclesAdminPage;
