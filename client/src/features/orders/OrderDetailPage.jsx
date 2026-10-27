import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Truck, Wallet, PackageCheck, CheckCircle2, XCircle, Ban, ChefHat, PackageOpen, Navigation, Phone, MapPin } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section, { DetailList } from '../../components/common/Section';
import StatusBadge from '../../components/common/StatusBadge';
import Stepper, { Timeline } from '../../components/common/Stepper';
import Button from '../../components/common/Button';
import { PageLoader } from '../../components/common/Spinner';
import ErrorState from '../../components/feedback/ErrorState';
import Alert from '../../components/feedback/Alert';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import QuantityConfirmModal from './QuantityConfirmModal';
import RecordPaymentModal from '../payments/RecordPaymentModal';
import RequestTransportModal from '../transport/RequestTransportModal';
import useAsync from '../../hooks/useAsync';
import { ordersApi, paymentsApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatKg, formatDateTime, humanize, modeLabel } from '../../utils/format';
import { ORDER_STEPS, ORDER_TYPE_LABELS, TRIP_ACTIVE } from '../../constants/status';
import { roleLabel } from '../../constants/roles';
import { placeUrl } from '../../utils/maps';

const SELLER_ACTIONS = {
  PLACED: [
    { to: 'ACCEPTED', label: 'Accept order', icon: CheckCircle2 },
    { to: 'REJECTED', label: 'Reject', icon: XCircle, variant: 'secondary', reason: true },
  ],
  ACCEPTED: [
    { to: 'PREPARING', label: 'Start preparing', icon: ChefHat },
    { to: 'CANCELLED', label: 'Cancel order', icon: Ban, variant: 'secondary', reason: true },
  ],
  PREPARING: [
    { to: 'READY', label: 'Mark ready for pickup', icon: PackageOpen },
    { to: 'CANCELLED', label: 'Cancel order', icon: Ban, variant: 'secondary', reason: true },
  ],
  READY: [{ to: 'DISPATCHED', label: 'Mark dispatched', icon: Truck }],
  DISPATCHED: [{ to: 'DELIVERED', label: 'Mark delivered', icon: PackageCheck, quantities: true }],
};
const BUYER_ACTIONS = {
  PLACED: [{ to: 'CANCELLED', label: 'Cancel order', icon: Ban, variant: 'secondary', reason: true }],
  ACCEPTED: [{ to: 'CANCELLED', label: 'Cancel order', icon: Ban, variant: 'secondary', reason: true }],
};

const partyName = (p) => p.shopProfile?.shopName || p.mandiProfile?.mandiName || p.farmerProfile?.farmName || p.name;

const OrderDetailPage = ({ base }) => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: order, loading, error, reload } = useAsync(() => ordersApi.get(id), [id]);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [qtyModal, setQtyModal] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [transportOpen, setTransportOpen] = useState(false);

  if (loading && !order) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const side = order.buyer.id === user.id ? 'BUYER' : order.seller.id === user.id ? 'SELLER' : 'ADMIN';
  const actions =
    side === 'SELLER'
      ? SELLER_ACTIONS[order.status] || []
      : side === 'BUYER'
        ? BUYER_ACTIONS[order.status] || []
        : ['PLACED', 'ACCEPTED', 'PREPARING'].includes(order.status)
          ? [{ to: 'CANCELLED', label: 'Cancel (moderation)', icon: Ban, variant: 'secondary', reason: true }]
          : [];

  const run = async (to, extra = {}) => {
    setBusy(true);
    try {
      await ordersApi.transition(order.id, { status: to, ...extra });
      toast.success(`Order marked ${humanize(to).toLowerCase()}`);
      setConfirm(null);
      await reload();
    } catch (e) {
      toast.error(e);
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const onAction = (a) => {
    if (a.quantities) return setQtyModal('deliver');
    if (a.reason || a.to === 'ACCEPTED' || a.to === 'DISPATCHED') return setConfirm(a);
    return run(a.to).catch(() => {});
  };

  const settlement = order.settlement;
  const target = settlement ? Number(settlement.netAmount) : Number(order.total);
  const due = Math.max(0, target - Number(order.amountPaid));
  const canPay = side === 'BUYER' && !['REJECTED', 'CANCELLED'].includes(order.status) && due > 0.004;
  const activeRequest = order.transportRequests.find((r) => ['OPEN', 'ASSIGNED'].includes(r.status));
  const canRequestTransport = side !== 'ADMIN' && ['ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && !activeRequest;
  const firstItem = order.items[0];
  const pickupSource = firstItem?.harvestListing || firstItem?.mandiLot;
  const offPath = ['REJECTED', 'CANCELLED'].includes(order.status) ? `${humanize(order.status)}: ${order.rejectionReason || order.cancelReason || ''}` : null;

  return (
    <>
      <PageHeader
        back={{ to: `${base}/orders`, label: 'Orders' }}
        title={`Order ${order.orderNumber}`}
        description={`${ORDER_TYPE_LABELS[order.type]} · placed ${formatDateTime(order.createdAt)}`}
        actions={
          <>
            {actions.map((a) => (
              <Button key={a.to} variant={a.variant || 'primary'} icon={a.icon} onClick={() => onAction(a)} disabled={busy}>
                {a.label}
              </Button>
            ))}
            {side === 'BUYER' && order.status === 'DELIVERED' && (
              <Button icon={PackageCheck} onClick={() => setQtyModal('receive')}>
                Confirm receipt
              </Button>
            )}
            {canRequestTransport && (
              <Button variant="secondary" icon={Truck} onClick={() => setTransportOpen(true)}>
                Request transport
              </Button>
            )}
            {canPay && (
              <Button variant="secondary" icon={Wallet} onClick={() => setPayOpen(true)}>
                Record payment
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-6">
        <Section>
          <Stepper steps={ORDER_STEPS} current={order.status} offPath={offPath} />
          {side === 'BUYER' && order.status === 'DELIVERED' && (
            <Alert tone="info" className="mt-4">
              Check the goods and confirm the kilos you actually received. Your stock and the seller’s settlement are based on this.
            </Alert>
          )}
        </Section>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <Section title="Items" bodyClass="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-soil-100/60 text-left text-xs text-soil-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Item</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Ordered</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Delivered</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Received</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Rate</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="num divide-y divide-soil-200">
                    {order.items.map((i) => (
                      <tr key={i.id}>
                        <td className="px-4 py-3 font-sans">
                          <span className="mr-1">{i.product?.emoji}</span>
                          {i.itemName}
                        </td>
                        <td className="px-4 py-3 text-right">{formatKg(i.quantityKg, { grams: false })}</td>
                        <td className="px-4 py-3 text-right">{i.deliveredQuantityKg != null ? formatKg(i.deliveredQuantityKg, { grams: false }) : '—'}</td>
                        <td className="px-4 py-3 text-right">{i.receivedQuantityKg != null ? formatKg(i.receivedQuantityKg, { grams: false }) : '—'}</td>
                        <td className="px-4 py-3 text-right">{formatINR(i.unitPrice)}/kg</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatINR(i.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-soil-200">
                      <td colSpan={5} className="px-4 py-3 text-right font-semibold">
                        Order value
                      </td>
                      <td className="num px-4 py-3 text-right font-display text-lg font-semibold">{formatINR(order.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Section>

            {order.trips.length > 0 && (
              <Section title="Transport">
                <ul className="divide-y divide-soil-200">
                  {order.trips.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-semibold">
                          {t.tripNumber} <StatusBadge status={t.status} className="ml-1" />
                        </p>
                        <p className="text-sm text-soil-500">
                          {t.driver.name} · {t.vehicle.registrationNumber} ({humanize(t.vehicle.type)})
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" icon={Phone} href={`tel:${t.driver.mobile}`}>
                          Call driver
                        </Button>
                        <Button size="sm" variant={TRIP_ACTIVE.includes(t.status) ? 'primary' : 'secondary'} icon={Navigation} to={`${base}/transport/trips/${t.id}`}>
                          {TRIP_ACTIVE.includes(t.status) ? 'Track live' : 'View trip'}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {activeRequest && !order.trips.some((t) => TRIP_ACTIVE.includes(t.status)) && (
              <Alert tone="info">
                Transport request {activeRequest.requestNumber} is waiting for a driver. <Link className="underline" to={`${base}/transport`}>View transport</Link>
              </Alert>
            )}

            <Section title="History">
              <Timeline
                items={order.history.map((h) => ({
                  id: h.id,
                  title: humanize(h.toStatus),
                  meta: `${formatDateTime(h.createdAt)}${h.changedBy ? ` · ${h.changedBy.name} (${roleLabel(h.changedBy.role)})` : ''}`,
                  note: h.note,
                }))}
              />
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Parties">
              <DetailList
                cols={1}
                items={[
                  ['Seller', `${partyName(order.seller)} — ${roleLabel(order.seller.role)}`],
                  ['Seller contact', <a key="s" className="link" href={`tel:${order.seller.mobile}`}>{order.seller.mobile}</a>],
                  ['Buyer', `${partyName(order.buyer)} — ${roleLabel(order.buyer.role)}`],
                  ['Buyer contact', <a key="b" className="link" href={`tel:${order.buyer.mobile}`}>{order.buyer.mobile}</a>],
                  ['Deliver to', order.deliveryAddress],
                  pickupSource && [
                    'Pickup from',
                    <a key="p" className="link inline-flex items-center gap-1" target="_blank" rel="noreferrer" href={placeUrl(pickupSource.latitude, pickupSource.longitude, [pickupSource.marketYardName, pickupSource.location, pickupSource.village, pickupSource.district].filter(Boolean).join(', '))}>
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {[pickupSource.marketYardName, pickupSource.location, pickupSource.village, pickupSource.district].filter(Boolean).join(', ') || 'Open map'}
                    </a>,
                  ],
                  firstItem?.mandiLot?.loadingInfo && ['Loading / gate', firstItem.mandiLot.loadingInfo],
                  order.expectedDeliveryAt && ['Wanted by', formatDateTime(order.expectedDeliveryAt)],
                  order.notes && ['Notes', order.notes],
                ]}
              />
            </Section>

            <Section title="Money">
              <DetailList
                cols={1}
                items={[
                  ['Order value', formatINR(order.total)],
                  settlement && ['Settlement', `${settlement.settlementNumber} · ${humanize(settlement.status)}`],
                  settlement && ['Received value (gross)', formatINR(settlement.grossAmount)],
                  settlement && Number(settlement.commissionAmount) > 0 && ['Commission / fees', `− ${formatINR(settlement.commissionAmount)}`],
                  settlement && ['Net payable to seller', formatINR(settlement.netAmount)],
                  ['Paid so far', formatINR(order.amountPaid)],
                  ['Balance due', <span key="d" className="font-semibold">{formatINR(due)}</span>],
                ]}
              />
              {order.payments.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-soil-200 pt-4 text-sm">
                  {order.payments.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3">
                      <span className="text-soil-500">
                        {formatDateTime(p.createdAt)} · {modeLabel(p.mode)}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </span>
                      <span className="num whitespace-nowrap font-semibold">{formatINR(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.label}
        message={
          confirm?.to === 'ACCEPTED'
            ? 'The buyer will be told you are fulfilling this order.'
            : confirm?.to === 'DISPATCHED'
              ? 'Use this when the goods leave without a KisanVani trip. With a trip, dispatch is recorded automatically at pickup.'
              : 'The other party is notified with your reason, and any reserved quantity goes back on sale.'
        }
        confirmLabel={confirm?.label}
        tone={confirm?.reason ? 'danger' : 'primary'}
        requireReason={confirm?.reason}
        busy={busy}
        onConfirm={(reason) => run(confirm.to, reason ? { reason } : {}).catch(() => {})}
      />

      <QuantityConfirmModal
        open={qtyModal === 'deliver'}
        onClose={() => setQtyModal(null)}
        title="Mark delivered"
        description="Enter the quantity handed over for each item."
        items={order.items}
        field="deliveredQuantityKg"
        cap={(i) => i.quantityKg}
        defaultQty={(i) => i.quantityKg}
        confirmLabel="Mark delivered"
        onConfirm={(items) => run('DELIVERED', { items })}
      />
      <QuantityConfirmModal
        open={qtyModal === 'receive'}
        onClose={() => setQtyModal(null)}
        title="Confirm receipt"
        description={user.role === 'SHOPKEEPER' ? 'These kilos are added to your stock and the seller’s settlement is created.' : 'The seller’s settlement is created from these kilos.'}
        items={order.items}
        field="receivedQuantityKg"
        cap={(i) => i.deliveredQuantityKg ?? i.quantityKg}
        defaultQty={(i) => i.deliveredQuantityKg ?? i.quantityKg}
        confirmLabel="Confirm receipt"
        onConfirm={async (items) => {
          try {
            await ordersApi.receive(order.id, { items });
            toast.success('Receipt confirmed. Stock and settlement updated.');
            await reload();
          } catch (e) {
            toast.error(e);
            throw e;
          }
        }}
      />
      <RecordPaymentModal open={payOpen} onClose={() => setPayOpen(false)} due={due} payeeName={partyName(order.seller)} onSubmit={(body) => paymentsApi.payOrder(order.id, body).then(reload)} />
      <RequestTransportModal
        open={transportOpen}
        onClose={() => setTransportOpen(false)}
        onCreated={reload}
        orderId={order.id}
        defaults={{
          commodity: order.items.map((i) => `${i.itemName.split(' · ')[0]} ${Number(i.quantityKg)} kg`).join(', '),
          expectedQuantityKg: String(order.items.reduce((a, i) => a + Number(i.quantityKg), 0)),
          pickupAddress: pickupSource ? [pickupSource.marketYardName, pickupSource.location, pickupSource.village, pickupSource.district].filter(Boolean).join(', ') : '',
          pickupLat: pickupSource?.latitude ?? null,
          pickupLng: pickupSource?.longitude ?? null,
          pickupContactName: order.seller.name,
          pickupContactPhone: order.seller.mobile,
          dropAddress: order.deliveryAddress || '',
          // The buyer's own profile pin is the natural drop point when the buyer requests transport.
          dropLat: side === 'BUYER' ? (user.shopProfile || user.mandiProfile)?.address?.latitude ?? null : null,
          dropLng: side === 'BUYER' ? (user.shopProfile || user.mandiProfile)?.address?.longitude ?? null : null,
          dropContactName: order.buyer.name,
          dropContactPhone: order.buyer.mobile,
        }}
      />
    </>
  );
};

export default OrderDetailPage;
