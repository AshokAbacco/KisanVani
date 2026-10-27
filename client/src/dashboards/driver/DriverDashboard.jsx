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
        description="Your trips, vehicle and earnings."
        actions={
          <Button to="/driver/assignments" icon={ClipboardList}>
            Find loads{c?.openLoads ? ` (${c.openLoads})` : ''}
          </Button>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          {!loading && !data?.vehicles?.length && (
            <Alert tone="warning" title="Register your vehicle to start" action={<Button size="sm" to="/driver/vehicles">Add vehicle</Button>}>
              You need at least one verified vehicle before you can take trips.
            </Alert>
          )}
          {!loading && data?.vehicles?.length > 0 && !verified && <Alert tone="info">Your vehicle is waiting for admin verification. You can take trips once it is verified.</Alert>}
          {expiring.map((v) => (
            <Alert key={v.id} tone="warning" action={<Button size="sm" variant="secondary" to={`/driver/vehicles/${v.id}`}>Update documents</Button>}>
              <AlertTriangle className="sr-only" /> Documents for {v.registrationNumber} expire soon or have expired.
            </Alert>
          ))}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Assigned trips" value={c?.assignedTrips} icon={ClipboardList} tone="amber" loading={loading} to="/driver/pickups" />
            <StatCard label="Trips in transit" value={c?.inTransit} icon={Truck} tone="blue" loading={loading} to="/driver/deliveries" />
            <StatCard label="Completed trips" value={c?.completedTrips} icon={CheckCircle2} tone="green" loading={loading} to="/driver/history" />
            <StatCard label="Total earnings" value={formatINR(c?.totalEarnings, { whole: true })} hint={c && `${formatINR(c.pendingEarnings, { whole: true })} still to be paid`} icon={Wallet} loading={loading} to="/driver/earnings" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Section title="Current trips" bodyClass="p-0">
              <ul className="divide-y divide-soil-100">
                {(data?.currentTrips || []).map((tr) => (
                  <li key={tr.id}>
                    <Link to={`/driver/trips/${tr.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-leafwhite">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {tr.tripNumber} <span className="font-normal text-soil-500">— {tr.commodity}</span>
                        </p>
                        <p className="truncate text-sm text-soil-500">
                          {tr.pickupAddress} to {tr.dropAddress}
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
                    No active trips. <Link to="/driver/assignments" className="link">See open loads</Link>
                  </li>
                )}
              </ul>
            </Section>
            <div className="space-y-6">
              <Section title="Earnings, last 14 days">
                <BarsChart data={data?.dailyEarnings || []} x="day" series={[{ key: 'amount', label: 'Earned' }]} height={200} />
              </Section>
              <Section title="Vehicles" bodyClass="p-0">
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
                          {v.insuranceExpiry && `Ins. ${formatDate(v.insuranceExpiry)}`}
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
