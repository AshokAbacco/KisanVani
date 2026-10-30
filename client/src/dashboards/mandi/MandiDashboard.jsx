import { Link } from 'react-router-dom';
import { Boxes, ClipboardList, Weight, IndianRupee, Percent, PlusCircle, Sprout } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/feedback/ErrorState';
import { TrendChart } from '../../components/charts/Charts';
import useAsync from '../../hooks/useAsync';
import { mandiApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatKg, timeAgo } from '../../utils/format';
import { ORDER_TYPE_LABELS } from '../../constants/status';
import { useI18n } from '../../i18n';

const MandiDashboard = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => mandiApi.dashboard(), []);
  const c = data?.cards;
  const commissionPct = Number(user.mandiProfile?.commissionPercent || 0);

  return (
    <>
      <PageHeader
        title={user.mandiProfile?.mandiName || t('roles.MANDI_OWNER')}
        description={user.mandiProfile?.marketYardName || t('mandiDash.desk')}
        actions={
          <>
            <Button to="/mandi/procurement" variant="secondary" icon={Sprout}>
              {t('dnav.tabs.buyFromFarmers')}
            </Button>
            <Button to="/mandi/lots/new" icon={PlusCircle}>
              {t('lots.createNew')}
            </Button>
          </>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label={t('mandiDash.availableLots')} value={c?.availableLots} icon={Boxes} loading={loading} to="/mandi/lots" />
            <StatCard label={t('mandiDash.wholesaleOrders')} value={c?.wholesaleOrders} hint={c?.pendingOrders ? t('mandiDash.newCount', '', { n: c.pendingOrders }) : t('farmerDash.noneWaiting')} icon={ClipboardList} tone={c?.pendingOrders ? 'amber' : 'green'} loading={loading} to="/mandi/incoming" />
            <StatCard label={t('mandiDash.volume')} value={formatKg(c?.totalWholesaleVolumeKg, { grams: false })} icon={Weight} tone="blue" loading={loading} />
            <StatCard label={t('mandiDash.tradeValue')} value={formatINR(c?.tradeValue, { whole: true })} icon={IndianRupee} loading={loading} to="/mandi/reports" />
            <StatCard label={t('mandiDash.commissionEarned')} value={formatINR(c?.commissionEarned, { whole: true })} hint={commissionPct ? t('mandiDash.commissionAt', '', { pct: commissionPct }) : t('mandiDash.notConfigured')} icon={Percent} tone="amber" loading={loading} to="/mandi/profile" />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Section title={t('mandiDash.trade14')}>
              <TrendChart data={data?.dailyTrade || []} series={[{ key: 'value', label: t('mandiDash.orderValue') }]} height={250} />
            </Section>
            <Section title={t('mandiDash.latestOrders')} actions={<Link to="/mandi/orders" className="link text-sm">{t('dnav.tabs.allOrders')}</Link>} bodyClass="p-0">
              <ul className="divide-y divide-soil-100">
                {(data?.recentOrders || []).map((o) => {
                  const selling = o.seller.name === user.name && o.type !== 'MANDI_FROM_FARMER';
                  return (
                    <li key={o.id}>
                      <Link to={`/mandi/orders/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-leafwhite">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{o.type === 'MANDI_FROM_FARMER' ? t('mandiDash.fromName', '', { name: o.seller.name }) : t('mandiDash.toName', '', { name: o.buyer.name })}</p>
                          <p className="truncate text-xs text-soil-500">
                            {ORDER_TYPE_LABELS[o.type]} — {o.items.map((i) => `${i.itemName.split(' (')[0]} ${formatKg(i.quantityKg)}`).join(', ')} — {timeAgo(o.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={o.status} />
                          <span className={`num hidden w-24 text-right font-semibold sm:block ${selling ? '' : 'text-soil-600'}`}>{formatINR(o.total)}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
                {!loading && !data?.recentOrders?.length && <li className="px-5 py-10 text-center text-sm text-soil-500">{t('mandiDash.noOrders')}</li>}
              </ul>
            </Section>
          </div>
        </div>
      )}
    </>
  );
};

export default MandiDashboard;
