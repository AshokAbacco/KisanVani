import { Wheat } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import useAsync from '../../hooks/useAsync';
import { farmerApi } from '../../services';
import { formatINR, formatKg, formatDate } from '../../utils/format';
import { useI18n } from '../../i18n';

/** Crop-wise summary of everything the farmer has listed and sold. */
const MyCropsPage = () => {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAsync(() => farmerApi.crops(), []);
  return (
    <>
      <PageHeader title={t('crops.title')} description={t('crops.intro')} actions={<Button to="/farmer/listings/new">{t('dnav.tabs.postNewHarvest')}</Button>} />
      <DataTable
        list={{ items: data || [], loading, error, reload, meta: null }}
        rowKey="productId"
        columns={[
          { key: 'cropName', header: t('crops.crop'), render: (c) => <span className="font-medium">{`${c.emoji || ''} ${c.cropName}`}</span> },
          { key: 'listings', header: t('dnav.tabs.listings'), align: 'right' },
          { key: 'totalListedKg', header: t('crops.listed'), align: 'right', render: (c) => formatKg(c.totalListedKg, { grams: false }) },
          { key: 'availableKg', header: t('crops.stillForSale'), align: 'right', render: (c) => formatKg(c.availableKg, { grams: false }) },
          { key: 'soldKg', header: t('crops.receivedByBuyers'), align: 'right', render: (c) => formatKg(c.soldKg, { grams: false }) },
          { key: 'avgPricePerKg', header: t('crops.avgPrice'), align: 'right', render: (c) => t('common.perKg', '', { price: formatINR(c.avgPricePerKg) }) },
          { key: 'lastHarvestAt', header: t('crops.lastHarvest'), render: (c) => formatDate(c.lastHarvestAt) },
        ]}
        empty={<EmptyState icon={Wheat} title={t('crops.emptyTitle')} description={t('crops.emptyBody')} action={<Button to="/farmer/listings/new">{t('dnav.tabs.postNewHarvest')}</Button>} />}
      />
    </>
  );
};

export default MyCropsPage;
