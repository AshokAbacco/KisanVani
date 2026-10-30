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
import { useI18n } from '../../i18n';

const VehiclesAdminPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const list = useList((p) => vehiclesApi.list(p), { initialFilters: { verificationStatus: params.get('verificationStatus') || '', type: '' } });
  const expired = (d) => d && new Date(d) < new Date();
  return (
    <>
      <PageHeader title={t('dnav.tabs.vehicles')} description={t('adminVehicles.intro')} />
      <DataTable
        list={list}
        onRowClick={(v) => navigate(`/admin/vehicles/${v.id}`)}
        columns={[
          { key: 'registrationNumber', header: t('vehicles.registration'), sortable: true, render: (v) => <span className="num whitespace-nowrap font-semibold">{v.registrationNumber}</span> },
          { key: 'type', header: t('common.type'), render: (v) => humanize(v.type) },
          { key: 'capacityKg', header: t('vehicles.capacity'), align: 'right', sortable: true, render: (v) => formatKg(v.capacityKg) },
          { key: 'driver', header: t('roleNames.DRIVER'), render: (v) => `${v.driver.name} (${v.driver.mobile})` },
          { key: 'docs', header: t('dnav.tabs.documents'), align: 'right', render: (v) => v.documents.length },
          { key: 'insurance', header: t('vehicles.insuranceUntilShort'), render: (v) => <span className={expired(v.insuranceExpiry) ? 'font-semibold text-red-600' : ''}>{formatDate(v.insuranceExpiry)}</span> },
          { key: 'verificationStatus', header: t('vehicles.verification'), render: (v) => <StatusBadge status={v.verificationStatus} /> },
        ]}
        toolbar={
          <>
            <Tabs
              value={list.filters.verificationStatus}
              onChange={(verificationStatus) => list.setFilters({ verificationStatus })}
              tabs={[
                { value: '', label: t('common.all') },
                { value: 'PENDING', label: t('adminVehicles.toVerify') },
                { value: 'VERIFIED', label: humanize('VERIFIED') },
                { value: 'REJECTED', label: humanize('REJECTED') },
              ]}
            />
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('adminVehicles.searchPlaceholder')} className="sm:w-72" />
          </>
        }
        empty={<EmptyState icon={Car} title={t('adminVehicles.emptyTitle')} />}
      />
    </>
  );
};

export default VehiclesAdminPage;
