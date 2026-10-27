import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR, formatINRCompact, formatNumber, formatDate } from '../../utils/format';
import EmptyState from '../common/EmptyState';
import { BarChart3 } from 'lucide-react';

// Series colours chosen to stay distinguishable for common colour-vision deficiencies.
export const SERIES = ['#1F6F3D', '#E09A1B', '#1D5E9B', '#B44F16', '#6B5CA5', '#3FA34D'];

const axis = { fontSize: 12, fill: '#5B6B60' };
const shortDay = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v, { year: undefined }) : /^\d{4}-\d{2}$/.test(v) ? formatDate(`${v}-01`, { day: undefined, year: '2-digit' }) : v);

const fmt = (kind) => (kind === 'money' ? formatINRCompact : formatNumber);
const tipFmt = (kind) => (kind === 'money' ? (v) => formatINR(v) : (v) => formatNumber(v));

const Frame = ({ data, height, children }) =>
  !data?.length ? (
    <EmptyState compact icon={BarChart3} title="No data for this period" />
  ) : (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );

/** series = [{ key, label, kind?: 'money'|'count' }] */
export const TrendChart = ({ data, x = 'day', series, height = 260, kind = 'money', line = false }) => {
  // A trend needs at least three points; with fewer, bars read more honestly than a lone dot.
  if (data && data.length > 0 && data.length < 3) return <BarsChart data={data} x={x} series={series} height={height} kind={kind} />;
  const C = line ? LineChart : AreaChart;
  return (
    <Frame data={data} height={height}>
      <C data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#EDF1EE" vertical={false} />
        <XAxis dataKey={x} tick={axis} tickFormatter={shortDay} tickLine={false} axisLine={{ stroke: '#DCE4DE' }} minTickGap={16} />
        <YAxis tick={axis} tickFormatter={fmt(kind)} tickLine={false} axisLine={false} width={60} />
        <Tooltip formatter={(v, n) => [tipFmt(series.find((s) => s.label === n)?.kind || kind)(v), n]} labelFormatter={shortDay} contentStyle={{ borderRadius: 10, borderColor: '#DCE4DE' }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) =>
          line ? (
            <Line key={s.key} type="monotone" dataKey={(d) => Number(d[s.key] || 0)} name={s.label} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={false} />
          ) : (
            <Area key={s.key} type="monotone" dataKey={(d) => Number(d[s.key] || 0)} name={s.label} stroke={SERIES[i % SERIES.length]} fill={SERIES[i % SERIES.length]} fillOpacity={0.12} strokeWidth={2} />
          )
        )}
      </C>
    </Frame>
  );
};

export const BarsChart = ({ data, x = 'name', series, height = 260, kind = 'money', layout = 'horizontal', stacked = false }) => (
  <Frame data={data} height={height}>
    <BarChart data={data} layout={layout === 'vertical' ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
      <CartesianGrid stroke="#EDF1EE" vertical={layout === 'vertical'} horizontal={layout !== 'vertical'} />
      {layout === 'vertical' ? (
        <>
          <XAxis type="number" tick={axis} tickFormatter={fmt(kind)} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey={x} tick={axis} width={110} tickLine={false} axisLine={false} />
        </>
      ) : (
        <>
          <XAxis dataKey={x} tick={axis} tickFormatter={shortDay} tickLine={false} axisLine={{ stroke: '#DCE4DE' }} minTickGap={8} />
          <YAxis tick={axis} tickFormatter={fmt(kind)} tickLine={false} axisLine={false} width={60} />
        </>
      )}
      <Tooltip formatter={(v, n) => [tipFmt(kind)(v), n]} labelFormatter={shortDay} contentStyle={{ borderRadius: 10, borderColor: '#DCE4DE' }} cursor={{ fill: '#F4F8F2' }} />
      {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
      {series.map((s, i) => (
        <Bar key={s.key} dataKey={(d) => Number(d[s.key] || 0)} name={s.label} fill={SERIES[i % SERIES.length]} radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]} stackId={stacked ? 'a' : undefined} maxBarSize={36} />
      ))}
    </BarChart>
  </Frame>
);
