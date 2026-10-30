import { Tags } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import useAsync from '../../hooks/useAsync';
import { mandiApi } from '../../services';
import { formatINR, formatKg, humanize } from '../../utils/format';
import { useI18n } from '../../i18n';

/** Commodity-level view across all open lots. */
const WholesaleProductsPage = () => {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAsync(() => mandiApi.products(), []);
  return (
    <>
      <PageHeader title={t('dnav.tabs.wholesaleProducts')} description={t('wholesale.intro')} actions={<Button to="/mandi/lots/new">{t('lots.createNew')}</Button>} />
      <DataTable
        list={{ items: data || [], loading, error, reload, meta: null }}
        rowKey="productId"
        columns={[
          { key: 'commodityName', header: t('lots.commodity'), render: (p) => <span className="font-medium">{`${p.emoji || ''} ${p.commodityName}`}</span> },
          { key: 'category', header: t('common.category') },
          { key: 'lots', header: t('dnav.items.lots'), align: 'right' },
          { key: 'availableWeightKg', header: humanize('AVAILABLE'), align: 'right', render: (p) => formatKg(p.availableWeightKg, { grams: false }) },
          { key: 'totalWeightKg', header: t('wholesale.totalListed'), align: 'right', render: (p) => formatKg(p.totalWeightKg, { grams: false }) },
          { key: 'range', header: t('wholesale.priceRange'), align: 'right', render: (p) => t('common.perKg', '', { price: Number(p.minPricePerKg) === Number(p.maxPricePerKg) ? formatINR(p.minPricePerKg) : `${formatINR(p.minPricePerKg)} – ${formatINR(p.maxPricePerKg)}` }) },
        ]}
        empty={<EmptyState icon={Tags} title={t('wholesale.emptyTitle')} description={t('wholesale.emptyBody')} action={<Button to="/mandi/lots/new">{t('lots.createNew')}</Button>} />}
      />
    </>
  );
};

export default WholesaleProductsPage;
