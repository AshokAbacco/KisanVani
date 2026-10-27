import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, Printer, Usb, Banknote, QrCode, HandCoins, CheckCircle2, RotateCcw, Scale } from 'lucide-react';
import SearchInput from '../../components/common/SearchInput';
import Tabs from '../../components/common/Tabs';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Alert from '../../components/feedback/Alert';
import { PageLoader } from '../../components/common/Spinner';
import { inventoryApi, billingApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { posReducer, initialBill, billTotals, lineTotalPaise } from '../../store/posStore';
import useWeighingScale from '../../features/billing/useWeighingScale';
import { formatINR, formatKg } from '../../utils/format';
import { newId } from '../../utils/id';
import { errorMessage } from '../../utils/errors';
import { useDebounce } from '../../hooks/useDebounce';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'VEGETABLE', label: 'Vegetables' },
  { value: 'FRUIT', label: 'Fruits' },
  { value: 'LEAFY_GREEN', label: 'Leafy greens' },
];
const QUICK = [
  { kg: 0.25, label: '250 g' },
  { kg: 0.5, label: '500 g' },
  { kg: 1, label: '1 kg' },
  { kg: 2, label: '2 kg' },
  { kg: 5, label: '5 kg' },
];
const MODES = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI / QR', icon: QrCode },
  { value: 'CREDIT', label: 'Udhar', icon: HandCoins },
];

/** Retail billing with weight entry, quick weights, optional serial scale and 80 mm memo printing. */
const POSPage = () => {
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const debounced = useDebounce(search, 250);
  const [bill, dispatch] = useReducer(posReducer, initialBill);
  const [active, setActive] = useState(null);
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('kg');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);
  const billKey = useRef(newId());
  const weightInput = useRef(null);

  const scale = useWeighingScale({ enabled: !!config?.weighingScale?.enabled, baudRate: config?.weighingScale?.baudRate });

  const loadStock = () =>
    inventoryApi
      .list({ limit: 100, categoryType: category || undefined, search: debounced || undefined, sortBy: 'name', sortOrder: 'asc' })
      .then(({ data }) => setItems(data))
      .catch((e) => toast.error(e))
      .finally(() => setLoading(false));

  useEffect(() => {
    billingApi.posConfig().then(setConfig).catch((e) => toast.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    loadStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, debounced]);

  useEffect(() => {
    if (scale.reading && active) {
      setUnit('kg');
      setWeight(String(scale.reading.kg));
    }
  }, [scale.reading, active]);

  const totals = billTotals(bill);
  const weightKg = useMemo(() => {
    const n = Number(weight);
    if (!weight || !Number.isFinite(n) || n <= 0) return 0;
    return unit === 'g' ? Math.round(n) / 1000 : Math.round(n * 1000) / 1000;
  }, [weight, unit]);
  const inBill = (id) => bill.lines.find((l) => l.inventoryItemId === id)?.quantityKg || 0;
  const remaining = active ? Number(active.quantityKg) - inBill(active.id) : 0;

  const pick = (item) => {
    setActive(item);
    setWeight('');
    setUnit('kg');
    setSaved(null);
    setTimeout(() => weightInput.current?.focus(), 0);
  };

  const addActive = () => {
    if (!active || weightKg <= 0) return;
    if (weightKg > remaining + 1e-9) {
      toast.warning(`Only ${formatKg(remaining)} of ${active.product.name} in stock`);
      return;
    }
    dispatch({ type: 'add', item: active, quantityKg: weightKg });
    setActive(null);
    setWeight('');
  };

  const setLineQty = (line, kg) => {
    const q = Math.max(0, Math.round(kg * 1000) / 1000);
    if (q === 0) return dispatch({ type: 'remove', id: line.inventoryItemId });
    if (q > line.available) return toast.warning(`Only ${formatKg(line.available)} in stock`);
    return dispatch({ type: 'setQty', id: line.inventoryItemId, quantityKg: q });
  };

  const maxDiscount = (totals.subtotal * Number(config?.maxDiscountPercent || 0)) / 100;
  const discountError = Number(bill.discount || 0) > maxDiscount + 0.001 ? `Max ${config?.maxDiscountPercent}% (${formatINR(maxDiscount)})` : null;
  const creditNeedsCustomer = bill.paymentMode === 'CREDIT' && (!bill.customerName.trim() || !/^[6-9]\d{9}$/.test(bill.customerMobile.replace(/\D/g, '').slice(-10)));
  const mobileError = bill.customerMobile && !/^(\+?91)?[6-9]\d{9}$/.test(bill.customerMobile.replace(/[\s-]/g, '')) ? 'Enter a 10-digit mobile' : null;
  const canSave = bill.lines.length > 0 && !discountError && !creditNeedsCustomer && !mobileError && totals.total > 0 && !saving;

  const save = async (print) => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const printWin = print ? window.open('', '_blank') : null;
    try {
      const { data: invoice } = await billingApi.create({
        idempotencyKey: billKey.current,
        items: bill.lines.map((l) => ({ inventoryItemId: l.inventoryItemId, quantityKg: String(l.quantityKg) })),
        discount: bill.discount ? String(Number(bill.discount).toFixed(2)) : '0',
        paymentMode: bill.paymentMode,
        amountPaid: bill.paymentMode === 'CREDIT' ? String(Number(bill.amountPaid || 0).toFixed(2)) : undefined,
        paymentReference: bill.paymentReference || null,
        customerName: bill.customerName.trim() || null,
        customerMobile: bill.customerMobile.trim() || null,
      });
      setSaved(invoice);
      if (printWin) printWin.location.href = `/shop/invoices/${invoice.id}/print?auto=1`;
      dispatch({ type: 'reset' });
      billKey.current = newId();
      toast.success(`Bill ${invoice.invoiceNumber} saved — ${formatINR(invoice.total)}`);
      loadStock();
    } catch (e) {
      printWin?.close();
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!config && loading) return <PageLoader label="Opening the counter…" />;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      {/* Products */}
      <section aria-label="Products" className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Billing</h1>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Tabs tabs={CATEGORIES} value={category} onChange={setCategory} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search tomato, tamatar…" className="w-full sm:w-56" autoFocus />
          </div>
        </div>

        {/* Weighing panel */}
        <div className={`panel mb-4 p-4 ${active ? 'ring-2 ring-field-500' : ''}`}>
          {active ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-center gap-3 lg:w-56">
                <span className="text-4xl" aria-hidden>
                  {active.product.emoji || '🧺'}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{active.product.name}</p>
                  <p className="num text-sm text-soil-500">
                    {formatINR(active.sellingPricePerKg)}/kg · {formatKg(remaining)} left
                  </p>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-2">
                  <label className="relative flex-1">
                    <span className="sr-only">Weight</span>
                    <input
                      ref={weightInput}
                      className="input num h-14 text-right font-display text-3xl font-semibold"
                      inputMode="decimal"
                      placeholder="0"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ''))}
                      onKeyDown={(e) => e.key === 'Enter' && addActive()}
                    />
                  </label>
                  <div className="flex rounded-lg bg-soil-100 p-1" role="radiogroup" aria-label="Unit">
                    {['kg', 'g'].map((u) => (
                      <button key={u} role="radio" aria-checked={unit === u} onClick={() => setUnit(u)} className={`h-11 w-12 rounded-md text-base font-semibold ${unit === u ? 'bg-white shadow-sm' : 'text-soil-500'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => {
                        setUnit('kg');
                        setWeight(String(q.kg));
                      }}
                      className="num rounded-lg border border-soil-200 bg-white px-3 py-1.5 text-sm font-semibold hover:border-field-500 hover:bg-field-50"
                    >
                      {q.label}
                    </button>
                  ))}
                  {scale.available && (
                    <Button size="sm" variant={scale.connected ? 'subtle' : 'secondary'} icon={Usb} onClick={scale.connected ? scale.disconnect : scale.connect}>
                      {scale.connected ? `Scale: ${scale.reading ? formatKg(scale.reading.kg) : 'waiting'}` : 'Connect scale'}
                    </Button>
                  )}
                </div>
                {scale.error && <p className="text-sm text-red-600">{scale.error}</p>}
              </div>
              <div className="flex gap-2 lg:flex-col">
                <Button size="lg" onClick={addActive} disabled={weightKg <= 0} className="flex-1">
                  Add {weightKg > 0 ? formatINR(Math.round(weightKg * Number(active.sellingPricePerKg) * 100) / 100) : ''}
                </Button>
                <Button size="lg" variant="ghost" onClick={() => setActive(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-soil-500">
              <Scale className="h-5 w-5" aria-hidden /> Tap a product, then enter its weight or use a quick weight.
            </p>
          )}
        </div>

        {items.length === 0 && !loading ? (
          <div className="panel">
            <EmptyState title="No products to sell" description="Add products and selling rates in the stock & rates master first." action={<Button to="/shop/stock">Open stock & rates master</Button>} />
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {items.map((it) => {
              const left = Number(it.quantityKg) - inBill(it.id);
              const out = left <= 0;
              return (
                <li key={it.id}>
                  <button
                    onClick={() => pick(it)}
                    disabled={out}
                    className={`panel flex h-full w-full flex-col items-start p-3 text-left transition hover:border-field-500 disabled:cursor-not-allowed disabled:opacity-50 ${active?.id === it.id ? 'border-field-600 ring-2 ring-field-500' : ''}`}
                  >
                    <span className="text-3xl" aria-hidden>
                      {it.product.emoji || '🧺'}
                    </span>
                    <span className="mt-2 font-semibold leading-tight">{it.product.name}</span>
                    {it.product.localName && <span className="text-xs text-soil-500">{it.product.localName}</span>}
                    <span className="num mt-auto pt-2 font-display text-lg font-semibold">{formatINR(it.sellingPricePerKg)}/kg</span>
                    <span className={`num text-xs ${out ? 'text-red-600' : it.isLowStock ? 'text-turmeric-700' : 'text-soil-500'}`}>{out ? 'Out of stock' : `${formatKg(left)} in stock`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Bill */}
      <aside aria-label="Current bill" className="panel flex flex-col xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between border-b border-soil-200 px-4 py-3">
          <h2 className="text-lg font-semibold">Current bill</h2>
          {bill.lines.length > 0 && (
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => dispatch({ type: 'reset' })}>
              Clear
            </Button>
          )}
        </div>

        {saved && (
          <div className="border-b border-soil-200 p-4">
            <Alert tone="success" title={`Bill ${saved.invoiceNumber} saved`}>
              <span className="num">{formatINR(saved.total)}</span> paid by {saved.paymentMode === 'CREDIT' ? 'udhar' : saved.paymentMode.toLowerCase()}.
              <div className="mt-2 flex gap-2">
                <Button size="sm" icon={Printer} href={`/shop/invoices/${saved.id}/print?auto=1`}>
                  Print memo
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSaved(null)}>
                  Dismiss
                </Button>
              </div>
            </Alert>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {bill.lines.length === 0 ? (
            <p className="px-4 py-10 text-center text-soil-500">No items yet.</p>
          ) : (
            <ul className="divide-y divide-soil-100">
              {bill.lines.map((l) => (
                <li key={l.inventoryItemId} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-2xl" aria-hidden>
                    {l.emoji || '🧺'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.name}</p>
                    <p className="num text-xs text-soil-500">{formatINR(l.unitPrice)}/kg</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="rounded-md p-1 hover:bg-soil-100" onClick={() => setLineQty(l, l.quantityKg - (l.quantityKg > 1 ? 0.5 : 0.25))} aria-label={`Less ${l.name}`}>
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      className="input num h-8 w-20 px-2 text-right text-sm"
                      inputMode="decimal"
                      aria-label={`${l.name} kg`}
                      value={l.quantityKg}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        if (v === '' || Number(v) <= l.available) dispatch({ type: 'setQty', id: l.inventoryItemId, quantityKg: v });
                      }}
                      onBlur={(e) => setLineQty(l, Number(e.target.value || 0))}
                    />
                    <button className="rounded-md p-1 hover:bg-soil-100" onClick={() => setLineQty(l, Number(l.quantityKg) + (l.quantityKg >= 1 ? 0.5 : 0.25))} aria-label={`More ${l.name}`}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="num w-20 text-right font-semibold">{formatINR(lineTotalPaise(l) / 100)}</p>
                  <button className="rounded-md p-1 text-soil-400 hover:bg-red-50 hover:text-red-600" onClick={() => dispatch({ type: 'remove', id: l.inventoryItemId })} aria-label={`Remove ${l.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-soil-200 p-4">
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Customer name" value={bill.customerName} onChange={(e) => dispatch({ type: 'field', field: 'customerName', value: e.target.value })} aria-label="Customer name" />
            <input className={`input ${mobileError ? 'input-error' : ''}`} placeholder="Mobile" inputMode="tel" value={bill.customerMobile} onChange={(e) => dispatch({ type: 'field', field: 'customerMobile', value: e.target.value })} aria-label="Customer mobile" />
          </div>
          {mobileError && <p className="text-xs text-red-600">{mobileError}</p>}
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment mode">
            {MODES.map((m) => (
              <button
                key={m.value}
                role="radio"
                aria-checked={bill.paymentMode === m.value}
                onClick={() => dispatch({ type: 'field', field: 'paymentMode', value: m.value })}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold ${bill.paymentMode === m.value ? 'border-field-600 bg-field-50 text-field-800' : 'border-soil-200 text-soil-600 hover:bg-soil-100'}`}
              >
                <m.icon className="h-4 w-4" aria-hidden /> {m.label}
              </button>
            ))}
          </div>
          {bill.paymentMode === 'UPI' && (
            <div className="flex items-center gap-2">
              <input className="input" placeholder="UPI reference (optional)" value={bill.paymentReference} onChange={(e) => dispatch({ type: 'field', field: 'paymentReference', value: e.target.value })} aria-label="UPI reference" />
              {config?.shop?.upiId && <span className="whitespace-nowrap text-xs text-soil-500">Pay to {config.shop.upiId}</span>}
            </div>
          )}
          {bill.paymentMode === 'CREDIT' && (
            <div>
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="text-soil-600">Paid now</span>
                <input className="input num h-9 w-32 text-right" inputMode="decimal" placeholder="0" value={bill.amountPaid} onChange={(e) => dispatch({ type: 'field', field: 'amountPaid', value: e.target.value.replace(/[^\d.]/g, '') })} />
              </label>
              {creditNeedsCustomer && <p className="mt-1 text-xs text-turmeric-700">Udhar needs the customer’s name and mobile number.</p>}
            </div>
          )}
          <dl className="num space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-soil-500">Subtotal ({totals.items} items)</dt>
              <dd>{formatINR(totals.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-soil-500">Discount</dt>
              <dd>
                <input className={`input h-8 w-24 px-2 text-right ${discountError ? 'input-error' : ''}`} inputMode="decimal" placeholder="0" value={bill.discount} onChange={(e) => dispatch({ type: 'field', field: 'discount', value: e.target.value.replace(/[^\d.]/g, '') })} aria-label="Discount in rupees" />
              </dd>
            </div>
            {discountError && <p className="text-right text-xs text-red-600">{discountError}</p>}
            <div className="flex items-baseline justify-between border-t border-soil-200 pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-3xl font-bold">{formatINR(totals.total)}</dd>
            </div>
            {bill.paymentMode === 'CREDIT' && (
              <div className="flex justify-between text-turmeric-700">
                <dt>To khata</dt>
                <dd>{formatINR(Math.max(0, totals.total - Number(bill.amountPaid || 0)))}</dd>
              </div>
            )}
          </dl>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" variant="secondary" onClick={() => save(false)} disabled={!canSave} loading={saving}>
              Save bill
            </Button>
            <Button size="lg" icon={saving ? undefined : CheckCircle2} onClick={() => save(true)} disabled={!canSave} loading={saving}>
              Save & print
            </Button>
          </div>
          <p className="text-center text-xs text-soil-500">
            Prices come from your <Link to="/shop/stock" className="underline">rate master</Link> and are checked again when saving.
          </p>
        </div>
      </aside>
    </div>
  );
};

export default POSPage;
