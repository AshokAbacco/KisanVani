import { Link } from 'react-router-dom';
import { ClipboardList, Truck, CheckCircle2, Wallet, AlertTriangle, Navigation, Car } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/feedback/Alert';
import ErrorState from '../../components/feedback/ErrorState';
import { BarsChart } from '../../components/charts/Charts';
import useAsync from '../../hooks/useAsync';
import { driverApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { formatINR, formatDate, humanize } from '../../utils/format';

const soon = (d) => d && new Date(d) < new Date(Date.now() + 15 * 86400000);

const DriverDashboard = () => {
  const { user } = useAuth();
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => driverApi.dashboard(), []);
  const c = data?.cards;
  const verified = data?.vehicles?.some((v) => v.verificationStatus === 'VERIFIED');
  const expiring = (data?.vehicles || []).filter((v) => soon(v.insuranceExpiry) || soon(v.fitnessExpiry) || soon(v.permitExpiry));

  return (
    <>
      <PageHeader
        title={t('dashboard.greeting', 'Namaste, {name}', { name: user.name.split(' ')[0] })}
        description={t('driverDash.intro')}
        actions={
          <Button to="/driver/assignments" icon={ClipboardList}>
            {t('driverDash.findLoads')}
            {c?.openLoads ? ` (${c.openLoads})` : ''}
          </Button>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          {!loading && !data?.vehicles?.length && (
            <Alert tone="warning" title={t('driverDash.registerTitle')} action={<Button size="sm" to="/driver/vehicles">{t('vehicles.add')}</Button>}>
              {t('driverDash.registerBody')}
            </Alert>
          )}
          {!loading && data?.vehicles?.length > 0 && !verified && <Alert tone="info">{t('driverDash.awaitingVerification')}</Alert>}
          {expiring.map((v) => (
            <Alert key={v.id} tone="warning" action={<Button size="sm" variant="secondary" to={`/driver/vehicles/${v.id}`}>{t('driverDash.updateDocs')}</Button>}>
              <AlertTriangle className="sr-only" /> {t('driverDash.docsExpiring', '', { reg: v.registrationNumber })}
            </Alert>
          ))}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('driverDash.assignedTrips')} value={c?.assignedTrips} icon={ClipboardList} tone="amber" loading={loading} to="/driver/pickups" />
            <StatCard label={t('driverDash.inTransit')} value={c?.inTransit} icon={Truck} tone="blue" loading={loading} to="/driver/deliveries" />
            <StatCard label={t('driverDash.completedTrips')} value={c?.completedTrips} icon={CheckCircle2} tone="green" loading={loading} to="/driver/history" />
            <StatCard label={t('farmerDash.totalEarnings')} value={formatINR(c?.totalEarnings, { whole: true })} hint={c && t('driverDash.stillToBePaidAmount', '', { amount: formatINR(c.pendingEarnings, { whole: true }) })} icon={Wallet} loading={loading} to="/driver/earnings" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Section title={t('driverDash.currentTrips')} bodyClass="p-0">
              <ul className="divide-y divide-soil-100">
                {(data?.currentTrips || []).map((tr) => (
                  <li key={tr.id}>
                    <Link to={`/driver/trips/${tr.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-leafwhite">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {tr.tripNumber} <span className="font-normal text-soil-500">— {tr.commodity}</span>
                        </p>
                        <p className="truncate text-sm text-soil-500">
                          {t('common.fromTo', '', { from: tr.pickupAddress, to: tr.dropAddress })}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={tr.status} />
                        <Navigation className="h-4 w-4 text-soil-400" aria-hidden />
                      </div>
                    </Link>
                  </li>
                ))}
                {!loading && !data?.currentTrips?.length && (
                  <li className="px-5 py-10 text-center text-sm text-soil-500">
                    {t('driverDash.noActiveTrips')}{' '}
                    <Link to="/driver/assignments" className="link">
                      {t('driverDash.seeOpenLoads')}
                    </Link>
                  </li>
                )}
              </ul>
            </Section>
            <div className="space-y-6">
              <Section title={t('driverDash.earnings14')}>
                <BarsChart data={data?.dailyEarnings || []} x="day" series={[{ key: 'amount', label: t('earnings.earned') }]} height={200} />
              </Section>
              <Section title={t('dnav.tabs.vehicles')} bodyClass="p-0">
                <ul className="divide-y divide-soil-100">
                  {(data?.vehicles || []).map((v) => (
                    <li key={v.id}>
                      <Link to={`/driver/vehicles/${v.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-leafwhite">
                        <span className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-soil-400" aria-hidden />
                          <span className="num whitespace-nowrap font-semibold">{v.registrationNumber}</span>
                          <span className="text-sm text-soil-500">{humanize(v.type)}</span>
                        </span>
                        <span className="flex items-center gap-2 text-xs text-soil-500">
                          {v.insuranceExpiry && t('driverDash.insShort', '', { date: formatDate(v.insuranceExpiry) })}
                          <StatusBadge status={v.verificationStatus} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DriverDashboard;
