import { Wheat } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import useAsync from '../../hooks/useAsync';
import { farmerApi } from '../../services';
import { formatINR, formatKg, formatDate } from '../../utils/format';

/** Crop-wise summary of everything the farmer has listed and sold. */
const MyCropsPage = () => {
  const { data, loading, error, reload } = useAsync(() => farmerApi.crops(), []);
  return (
    <>
      <PageHeader title="My crops" description="Each crop you have listed, how much is still for sale and how much buyers have received." actions={<Button to="/farmer/listings/new">Post new harvest</Button>} />
      <DataTable
        list={{ items: data || [], loading, error, reload, meta: null }}
        rowKey="productId"
        columns={[
          { key: 'cropName', header: 'Crop', render: (c) => <span className="font-medium">{`${c.emoji || ''} ${c.cropName}`}</span> },
          { key: 'listings', header: 'Listings', align: 'right' },
          { key: 'totalListedKg', header: 'Listed', align: 'right', render: (c) => formatKg(c.totalListedKg, { grams: false }) },
          { key: 'availableKg', header: 'Still for sale', align: 'right', render: (c) => formatKg(c.availableKg, { grams: false }) },
          { key: 'soldKg', header: 'Received by buyers', align: 'right', render: (c) => formatKg(c.soldKg, { grams: false }) },
          { key: 'avgPricePerKg', header: 'Avg. price', align: 'right', render: (c) => `${formatINR(c.avgPricePerKg)}/kg` },
          { key: 'lastHarvestAt', header: 'Last harvest', render: (c) => formatDate(c.lastHarvestAt) },
        ]}
        empty={<EmptyState icon={Wheat} title="No crops listed yet" description="Post your first harvest to start receiving orders." action={<Button to="/farmer/listings/new">Post new harvest</Button>} />}
      />
    </>
  );
};

export default MyCropsPage;
