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
import { useI18n } from '../../i18n';

/** All of the driver's active trips on one map, with a shortcut into each trip's sharing controls. */
const LiveTrackingPage = () => {
  const { t } = useI18n();
  const { data, loading, reload } = useAsync(() => trackingApi.active(), []);
  if (loading && !data) return <PageLoader />;
  const trips = data || [];
  return (
    <>
      <PageHeader title={t('dnav.tabs.liveTracking')} description={t('liveTracking.intro')} actions={<Button variant="secondary" onClick={reload}>{t('common.refresh')}</Button>} />
      {!trips.length ? (
        <div className="panel">
          <EmptyState icon={Navigation} title={t('liveTracking.emptyTitle')} description={t('liveTracking.emptyBody')} action={<Button to="/driver/assignments">{t('liveTracking.seeAssignments')}</Button>} />
        </div>
      ) : (
        <div className="space-y-6">
          {trips.map((trip) => (
            <Section
              key={trip.id}
              title={`${trip.tripNumber} — ${trip.commodity}`}
              description={trip.lastLocationAt ? t('liveTracking.lastShared', '', { ago: timeAgo(trip.lastLocationAt) }) : t('liveTracking.notSharing')}
              actions={
                <>
                  <StatusBadge status={trip.status} />
                  <Button size="sm" to={`/driver/trips/${trip.id}`} icon={Navigation}>
                    {t('liveTracking.openTrip')}
                  </Button>
                </>
              }
            >
              <TripMap
                height={300}
                pickup={{ lat: trip.pickupLat, lng: trip.pickupLng, label: trip.pickupAddress }}
                drop={{ lat: trip.dropLat, lng: trip.dropLng, label: trip.dropAddress }}
                current={trip.lastLat != null ? { lat: trip.lastLat, lng: trip.lastLng, at: trip.lastLocationAt } : null}
                isStale={trip.isStale}
              />
              <p className="mt-2 text-sm text-soil-500">
                {t('liveTracking.summary', '', { from: trip.pickupAddress, to: trip.dropAddress, reg: trip.vehicle.registrationNumber })}{' '}
                <Link to={`/driver/trips/${trip.id}`} className="link">
                  {t('liveTracking.manageSharing')}
                </Link>
              </p>
            </Section>
          ))}
        </div>
      )}
    </>
  );
};

export default LiveTrackingPage;
