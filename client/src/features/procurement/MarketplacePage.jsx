import { useState } from 'react';
import { MapPin, Scale, ShoppingCart, Sprout, Warehouse, X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SearchInput from '../../components/common/SearchInput';
import Tabs from '../../components/common/Tabs';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import Pagination from '../../components/tables/Pagination';
import Modal from '../../components/modals/Modal';
import PlaceOrderModal from './PlaceOrderModal';
import useList from '../../hooks/useList';
import { procurementApi } from '../../services';
import { formatINR, formatKg, formatDate, humanize } from '../../utils/format';

const CATEGORY_TABS = [
  { value: '', label: 'All' },
  { value: 'VEGETABLE', label: 'Vegetables' },
  { value: 'FRUIT', label: 'Fruits' },
  { value: 'LEAFY_GREEN', label: 'Leafy greens' },
  { value: 'GRAIN', label: 'Grains' },
  { value: 'SPICE', label: 'Spices' },
];

const SORTS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'pricePerKg:asc', label: 'Price: low to high' },
  { value: 'pricePerKg:desc', label: 'Price: high to low' },
];

const view = (item, source) =>
  source === 'HARVEST'
    ? {
        name: item.cropName,
        detail: [item.variety, item.grade && `Grade ${item.grade}`].filter(Boolean).join(', '),
        seller: item.farmer.farmerProfile?.farmName || item.farmer.name,
        sellerSub: item.farmer.name,
        place: [item.village, item.district].filter(Boolean).join(', '),
        available: item.availableQuantityKg,
        extra: item.freshnessNotes ? `Fresh: ${item.freshnessNotes}` : `Harvested ${formatDate(item.harvestAt)}`,
      }
    : {
        name: item.commodityName,
        detail: [item.variety, item.grade && `Grade ${item.grade}`, item.lotType !== 'LOOSE' && `${humanize(item.lotType)} ${item.unitSizeKg ? `${Number(item.unitSizeKg)} kg` : ''}`].filter(Boolean).join(', '),
        seller: item.mandiOwner.mandiProfile?.mandiName || item.mandiOwner.name,
        sellerSub: `Lot ${item.lotCode}`,
        place: [item.marketYardName, item.location].filter(Boolean).join(', '),
        available: item.availableWeightKg,
        extra: item.qualityNotes || item.loadingInfo || '',
      };

/** Browse farmers' harvest listings or Market Mandi lots, compare up to three, and order. */
const MarketplacePage = ({ source, title, description, base }) => {
  const list = useList((p) => (source === 'HARVEST' ? procurementApi.harvests(p) : procurementApi.lots(p)), {
    initialFilters: { categoryType: '', district: '', maxPrice: '' },
    pageSize: 12,
    sortBy: 'createdAt',
  });
  const [ordering, setOrdering] = useState(null);
  const [compare, setCompare] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const toggleCompare = (item) =>
    setCompare((c) => (c.find((x) => x.id === item.id) ? c.filter((x) => x.id !== item.id) : c.length >= 3 ? c : [...c, item]));

  const SourceIcon = source === 'HARVEST' ? Sprout : Warehouse;

  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="panel mb-5 space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs tabs={CATEGORY_TABS} value={list.filters.categoryType} onChange={(categoryType) => list.setFilters({ categoryType })} />
          <SearchInput value={list.search} onChange={list.setSearch} placeholder={source === 'HARVEST' ? 'Crop, variety or village' : 'Commodity, yard or lot no.'} className="lg:w-72" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-soil-500">
            <span className="sr-only">District</span>
            <input className="input h-9 w-44 py-1" placeholder="District" value={list.filters.district} onChange={(e) => list.setFilters({ district: e.target.value })} />
          </label>
          <label className="text-sm text-soil-500">
            <span className="sr-only">Maximum price per kg</span>
            <input className="input h-9 w-40 py-1" inputMode="decimal" placeholder="Max ₹/kg" value={list.filters.maxPrice} onChange={(e) => list.setFilters({ maxPrice: e.target.value.replace(/[^\d.]/g, '') })} />
          </label>
          <select
            className="input h-9 w-auto py-1"
            aria-label="Sort"
            value={`${list.sort.sortBy}:${list.sort.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split(':');
              list.setSort({ sortBy, sortOrder });
            }}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {compare.length > 0 && (
            <Button size="sm" variant="subtle" icon={Scale} onClick={() => setCompareOpen(true)} className="ml-auto">
              Compare {compare.length}
            </Button>
          )}
        </div>
      </div>

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.loading && !list.items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel h-64 animate-pulse bg-soil-100/60" />
          ))}
        </div>
      ) : !list.items.length ? (
        <div className="panel">
          <EmptyState icon={SourceIcon} title="Nothing on offer matches" description="Try another category or clear the filters. New listings appear here as soon as sellers publish them." />
        </div>
      ) : (
        <ul className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${list.loading ? 'opacity-60' : ''}`}>
          {list.items.map((item) => {
            const v = view(item, source);
            const chosen = compare.some((c) => c.id === item.id);
            const photo = item.images?.[0] || item.product?.imageUrl;
            return (
              <li key={item.id} className="panel flex flex-col overflow-hidden">
                <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-field-50 to-leafwhite">
                  {photo ? <img src={photo} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="text-6xl" aria-hidden>{item.product?.emoji || '🧺'}</span>}
                  {item.distanceKm != null && <span className="num absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-soil-600">{item.distanceKm} km away</span>}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold">{v.name}</h3>
                      {v.detail && <p className="truncate text-sm text-soil-500">{v.detail}</p>}
                    </div>
                    <p className="num shrink-0 text-right font-display text-xl font-semibold">
                      {formatINR(item.pricePerKg)}
                      <span className="block text-xs font-normal text-soil-500">per kg</span>
                    </p>
                  </div>
                  <p className="mt-3 text-sm font-medium">{v.seller}</p>
                  <p className="text-xs text-soil-500">{v.sellerSub}</p>
                  {v.place && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-soil-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{v.place}</span>
                    </p>
                  )}
                  <dl className="num mt-3 grid grid-cols-2 gap-2 rounded-lg bg-leafwhite p-2.5 text-sm">
                    <div>
                      <dt className="text-xs text-soil-500">Available</dt>
                      <dd className="font-semibold">{formatKg(v.available, { grams: false })}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-soil-500">Min. order</dt>
                      <dd className="font-semibold">{formatKg(item.minOrderKg, { grams: false })}</dd>
                    </div>
                  </dl>
                  {v.extra && <p className="mt-2 line-clamp-2 text-xs text-soil-500">{v.extra}</p>}
                  <div className="mt-auto flex gap-2 pt-4">
                    <Button className="flex-1" icon={ShoppingCart} onClick={() => setOrdering(item)}>
                      Order
                    </Button>
                    <Button variant={chosen ? 'subtle' : 'secondary'} onClick={() => toggleCompare(item)} aria-pressed={chosen} disabled={!chosen && compare.length >= 3}>
                      {chosen ? 'Comparing' : 'Compare'}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="panel mt-4 overflow-hidden">
        <Pagination meta={list.meta} page={list.page} onPage={list.setPage} />
      </div>

      <PlaceOrderModal open={!!ordering} item={ordering} source={source} base={base} onClose={() => setOrdering(null)} />

      <Modal open={compareOpen} onClose={() => setCompareOpen(false)} title="Compare offers" size="xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-soil-200">
              {[
                ['Item', (i) => `${i.product?.emoji || ''} ${view(i, source).name}`],
                ['Variety / grade', (i) => view(i, source).detail || '—'],
                ['Seller', (i) => view(i, source).seller],
                ['Price per kg', (i) => formatINR(i.pricePerKg)],
                ['Available', (i) => formatKg(view(i, source).available, { grams: false })],
                ['Minimum order', (i) => formatKg(i.minOrderKg, { grams: false })],
                ['Cost of minimum order', (i) => formatINR(Number(i.minOrderKg) * Number(i.pricePerKg))],
                ['Location', (i) => view(i, source).place || '—'],
                ['Distance', (i) => (i.distanceKm != null ? `${i.distanceKm} km` : 'Unknown')],
              ].map(([label, fn]) => (
                <tr key={label}>
                  <th scope="row" className="whitespace-nowrap py-2.5 pr-4 text-left font-medium text-soil-500">
                    {label}
                  </th>
                  {compare.map((i) => (
                    <td key={i.id} className="num px-3 py-2.5">
                      {fn(i)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th />
                {compare.map((i) => (
                  <td key={i.id} className="px-3 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setCompareOpen(false);
                          setOrdering(i);
                        }}
                      >
                        Order
                      </Button>
                      <Button size="sm" variant="ghost" icon={X} onClick={() => toggleCompare(i)} aria-label="Remove from comparison" />
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
};

export default MarketplacePage;
