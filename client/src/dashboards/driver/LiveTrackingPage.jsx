import { Link } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { PageLoader } from '../../components/common/Spinner';
import TripMap from '../../components/maps/TripMap';
import useAsync from '../../hooks/useAsync';
import { trackingApi } from '../../services';
import { timeAgo } from '../../utils/format';

/** All of the driver's active trips on one map, with a shortcut into each trip's sharing controls. */
const LiveTrackingPage = () => {
  const { data, loading, reload } = useAsync(() => trackingApi.active(), []);
  if (loading && !data) return <PageLoader />;
  const trips = data || [];
  return (
    <>
      <PageHeader title="Live tracking" description="Location is only shared from inside a trip, after you switch it on." actions={<Button variant="secondary" onClick={reload}>Refresh</Button>} />
      {!trips.length ? (
        <div className="panel">
          <EmptyState icon={Navigation} title="No active trips" description="When you accept a trip, you can share your location from the trip screen." action={<Button to="/driver/assignments">See assignments</Button>} />
        </div>
      ) : (
        <div className="space-y-6">
          {trips.map((t) => (
            <Section
              key={t.id}
              title={`${t.tripNumber} — ${t.commodity}`}
              description={t.lastLocationAt ? `Last shared ${timeAgo(t.lastLocationAt)}` : 'Not sharing yet'}
              actions={
                <>
                  <StatusBadge status={t.status} />
                  <Button size="sm" to={`/driver/trips/${t.id}`} icon={Navigation}>
                    Open trip
                  </Button>
                </>
              }
            >
              <TripMap
                height={300}
                pickup={{ lat: t.pickupLat, lng: t.pickupLng, label: t.pickupAddress }}
                drop={{ lat: t.dropLat, lng: t.dropLng, label: t.dropAddress }}
                current={t.lastLat != null ? { lat: t.lastLat, lng: t.lastLng, at: t.lastLocationAt } : null}
                isStale={t.isStale}
              />
              <p className="mt-2 text-sm text-soil-500">
                {t.pickupAddress} to {t.dropAddress}. Vehicle {t.vehicle.registrationNumber}. <Link to={`/driver/trips/${t.id}`} className="link">Manage sharing</Link>
              </p>
            </Section>
          ))}
        </div>
      )}
    </>
  );
};

export default LiveTrackingPage;
