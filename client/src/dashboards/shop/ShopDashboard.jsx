import { Link } from 'react-router-dom';
import { IndianRupee, Receipt, AlertTriangle, ShoppingCart, HandCoins, Boxes, Scale, Sprout, Warehouse } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/feedback/ErrorState';
import { BarsChart } from '../../components/charts/Charts';
import useAsync from '../../hooks/useAsync';
import { shopApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { humanize } from '../../utils/format';
import { formatINR, formatKg, formatTime, modeLabel, plural } from '../../utils/format';

const ShopDashboard = () => {
  const { user } = useAuth();
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => shopApi.dashboard(), []);
  const c = data?.cards;

  return (
    <>
      <PageHeader
        title={t('dashboard.greeting', 'Namaste, {name}', { name: user.name.split(' ')[0] })}
        description={user.shopProfile?.shopName}
        actions={
          <>
            <Button to="/shop/order-farmers" variant="secondary" icon={Sprout}>
              {t('shopDash.buyFromFarmers')}
            </Button>
            <Button to="/shop/pos" icon={Scale}>
              {t('shopDash.startBilling')}
            </Button>
          </>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('shopDash.todaySales')} value={formatINR(c?.todaySales)} hint={c && plural(c.todayBills, 'bill')} icon={IndianRupee} loading={loading} to="/shop/sales" />
            <StatCard label={t('shopDash.thisMonth')} value={formatINR(c?.monthSales)} hint={c && plural(c.monthBills, 'bill')} icon={Receipt} loading={loading} to="/shop/reports" />
            <StatCard label={t('shopDash.lowStock')} value={c?.lowStockItems} hint={c && t('shopDash.lowStockHint', '', { n: c.stockItems })} icon={AlertTriangle} tone={c?.lowStockItems ? 'amber' : 'green'} loading={loading} to="/shop/inventory?lowStock=true" />
            <StatCard label={t('shopDash.udharOutstanding')} value={formatINR(c?.creditOutstanding)} hint={c && plural(c.creditCustomers, 'customer')} icon={HandCoins} tone="red" loading={loading} to="/shop/credit" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Section title={t('shopDash.sales7')} actions={<Link to="/shop/reports" className="text-sm link">{t('shopDash.fullReport')}</Link>}>
              <BarsChart data={data?.dailySales || []} x="day" series={[{ key: 'amount', label: t('shopDash.salesSeries') }]} height={240} />
            </Section>
            <Section title={t('shopDash.bestSellers')} bodyClass="p-0">
              {data?.topProducts?.length ? (
                <ul className="divide-y divide-soil-100">
                  {data.topProducts.map((p, i) => (
                    <li key={p.name} className="flex items-center justify-between px-5 py-3">
                      <span className="flex items-center gap-3">
                        <span className="num w-5 text-sm text-soil-400">{i + 1}</span>
                        <span className="font-medium">{p.name}</span>
                      </span>
                      <span className="num text-right text-sm">
                        <span className="font-semibold">{formatINR(p.amount)}</span>
                        <span className="block text-xs text-soil-500">{formatKg(p.qty)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-soil-500">{loading ? t('common.loading') : t('shopDash.noSales30')}</p>
              )}
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Section title={t('shopDash.recentBills')} actions={<Link to="/shop/sales" className="text-sm link">{t('shopDash.allBills')}</Link>} bodyClass="p-0">
              <ul className="divide-y divide-soil-100">
                {(data?.recentInvoices || []).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="num whitespace-nowrap font-semibold">{i.invoiceNumber}</p>
                      <p className="text-xs text-soil-500">
                        {t('shopDash.billAt', '', { customer: i.customerName || t('shopDash.walkIn'), time: formatTime(i.createdAt) })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={i.status === 'CANCELLED' ? 'CANCELLED' : i.paymentMode === 'CREDIT' ? 'PARTIAL' : 'PAID'}>{i.status === 'CANCELLED' ? humanize('CANCELLED') : modeLabel(i.paymentMode)}</StatusBadge>
                      <span className="num w-24 text-right font-semibold">{formatINR(i.total)}</span>
                    </div>
                  </li>
                ))}
                {!loading && !data?.recentInvoices?.length && <li className="px-5 py-10 text-center text-sm text-soil-500">{t('shopDash.noBills')}</li>}
              </ul>
            </Section>
            <div className="space-y-4">
              <Section title={t('shopDash.todayByMode')}>
                {data?.todayByMode?.length ? (
                  <ul className="space-y-2">
                    {data.todayByMode.map((m) => (
                      <li key={m.mode} className="flex justify-between text-sm">
                        <span>{modeLabel(m.mode)}</span>
                        <span className="num whitespace-nowrap font-semibold">{formatINR(m.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-soil-500">{t('shopDash.noSalesToday')}</p>
                )}
              </Section>
              <div className="grid grid-cols-2 gap-4">
                <StatCard label={t('shopDash.openPOs')} value={c?.pendingOrders} icon={ShoppingCart} tone="blue" loading={loading} to="/shop/orders" />
                <StatCard label={t('shopDash.productsStocked')} value={c?.stockItems} icon={Boxes} loading={loading} to="/shop/stock" />
              </div>
              <Button to="/shop/order-mandi" variant="secondary" icon={Warehouse} className="w-full">
                {t('shopDash.buyWholesale')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShopDashboard;
