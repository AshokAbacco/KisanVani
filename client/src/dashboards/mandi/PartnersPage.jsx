import { Handshake, Phone } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import EmptyState from '../../components/common/EmptyState';
import useAsync from '../../hooks/useAsync';
import { mandiApi } from '../../services';
import { roleLabel } from '../../constants/roles';
import { formatINR, formatDate } from '../../utils/format';
import { useI18n } from '../../i18n';

/** Farmers and shops this mandi has traded with. */
const PartnersPage = () => {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAsync(() => mandiApi.partners(), []);
  return (
    <>
      <PageHeader title={t('dnav.tabs.partners')} description={t('partners.intro')} />
      <DataTable
        list={{ items: data || [], loading, error, reload, meta: null }}
        columns={[
          { key: 'name', header: t('partners.partner'), render: (p) => <span className="font-medium">{p.name}</span> },
          { key: 'role', header: t('common.role'), render: (p) => roleLabel(p.role) },
          { key: 'mobile', header: t('common.contact'), render: (p) => <a className="link inline-flex items-center gap-1" href={`tel:${p.mobile}`}><Phone className="h-3.5 w-3.5" aria-hidden /> {p.mobile}</a> },
          { key: 'orders', header: t('dnav.items.orders'), align: 'right' },
          { key: 'value', header: t('mandiDash.tradeValue'), align: 'right', render: (p) => <span className="font-semibold">{formatINR(p.value)}</span> },
          { key: 'lastOrderAt', header: t('partners.lastOrder'), render: (p) => formatDate(p.lastOrderAt) },
        ]}
        empty={<EmptyState icon={Handshake} title={t('partners.emptyTitle')} description={t('partners.emptyBody')} />}
      />
    </>
  );
};

export default PartnersPage;
