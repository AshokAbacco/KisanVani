import { Tags } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import useAsync from '../../hooks/useAsync';
import { mandiApi } from '../../services';
import { formatINR, formatKg } from '../../utils/format';

/** Commodity-level view across all open lots. */
const WholesaleProductsPage = () => {
  const { data, loading, error, reload } = useAsync(() => mandiApi.products(), []);
  return (
    <>
      <PageHeader title="Wholesale products" description="Every commodity you are trading, combined across lots." actions={<Button to="/mandi/lots/new">Create new lot</Button>} />
      <DataTable
        list={{ items: data || [], loading, error, reload, meta: null }}
        rowKey="productId"
        columns={[
          { key: 'commodityName', header: 'Commodity', render: (p) => <span className="font-medium">{`${p.emoji || ''} ${p.commodityName}`}</span> },
          { key: 'category', header: 'Category' },
          { key: 'lots', header: 'Lots', align: 'right' },
          { key: 'availableWeightKg', header: 'Available', align: 'right', render: (p) => formatKg(p.availableWeightKg, { grams: false }) },
          { key: 'totalWeightKg', header: 'Total listed', align: 'right', render: (p) => formatKg(p.totalWeightKg, { grams: false }) },
          { key: 'range', header: 'Price range', align: 'right', render: (p) => (Number(p.minPricePerKg) === Number(p.maxPricePerKg) ? `${formatINR(p.minPricePerKg)}/kg` : `${formatINR(p.minPricePerKg)} – ${formatINR(p.maxPricePerKg)}/kg`) },
        ]}
        empty={<EmptyState icon={Tags} title="No commodities yet" description="Create a lot to start wholesale trading." action={<Button to="/mandi/lots/new">Create new lot</Button>} />}
      />
    </>
  );
};

export default WholesaleProductsPage;
