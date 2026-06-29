import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import { CHART_COLORS } from '@/design-tokens';
import { formatDA } from '@/lib/utils';

const axisStyle = { fontSize: 11, fill: '#94A3B8' };

function DarkTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl border border-slate-200 px-3 py-2 shadow-card text-xs">
      {label && <p className="font-semibold text-ink-primary mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-ink-secondary flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="text-ink-primary font-medium">{formatDA(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueAreaChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={48}
          tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} />
        <Tooltip content={<DarkTooltip />} cursor={{ stroke: 'rgba(15,23,42,0.12)' }} />
        <Area
          type="monotone"
          dataKey="value"
          name="Recettes"
          stroke="#6366F1"
          strokeWidth={2.5}
          fill="url(#revGrad)"
          dot={{ r: 3, fill: '#6366F1' }}
          activeDot={{ r: 5, fill: '#6366F1' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CountBarChart({
  data,
  color = '#8B5CF6',
}: {
  data: { name: string; value: number }[];
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.95} />
            <stop offset="100%" stopColor={color} stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(99,102,241,0.06)' }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="glass-strong rounded-xl border border-slate-200 px-3 py-2 text-xs">
                <p className="font-semibold text-ink-primary">{label}</p>
                <p className="text-ink-secondary">
                  {payload[0].name}:{' '}
                  <span className="text-ink-primary font-medium">{payload[0].value}</span>
                </p>
              </div>
            ) : null
          }
        />
        <Bar dataKey="value" name="Réservations" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({ data }: { data: { name: string; rate: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={64} />
        <Tooltip
          cursor={{ fill: 'rgba(99,102,241,0.06)' }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="glass-strong rounded-xl border border-slate-200 px-3 py-2 text-xs">
                <p className="font-semibold text-ink-primary">{label}</p>
                <p className="text-ink-secondary">
                  Occupation: <span className="text-ink-primary font-medium">{payload[0].value}%</span>
                </p>
              </div>
            ) : null
          }
        />
        <Bar dataKey="rate" fill="#06B6D4" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <p className="text-sm text-ink-muted text-center py-10">—</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<DarkTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ChartLegend({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
      {data.map((d, i) => (
        <span key={d.name} className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
          />
          {d.name}
        </span>
      ))}
    </div>
  );
}
