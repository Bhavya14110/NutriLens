"use client";

import { BarChart3, Leaf, Recycle, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Empty, ErrorBox, PageHeader } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsights } from "@/hooks/data";
import { GRADE_COLORS } from "@/lib/health";

const letter = (v: number) => ({ 5: "A", 4: "B", 3: "C", 2: "D", 1: "E" })[Math.round(v)] ?? "";
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)", fontSize: 12 } };
const axis = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false };

export function InsightsScreen() {
  const { data, isLoading, error, refetch } = useInsights();

  if (isLoading)
    return (
      <div>
        <PageHeader title="Insights" />
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  if (error) return <ErrorBox error={error} retry={() => refetch()} />;
  if (!data) return null;

  const any = data.usedVsWasted.some((m) => m.used || m.wasted) || data.gradeTrend.some((g) => g.scans) || data.nova4.total;
  const t = data.totals;
  const rate = t.used + t.wasted ? Math.round((t.used / (t.used + t.wasted)) * 100) : null;

  return (
    <div>
      <PageHeader title="Insights" sub={`How your kitchen is doing in ${data.month}.`} />
      {!any ? (
        <Empty icon={BarChart3} title="Not enough data yet" body="Scan a few products and mark items used or wasted — your charts will fill in here." cta={{ href: "/scan", label: "Scan something" }} />
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-3 gap-3">
            {[
              { k: "Used up", v: t.used, icon: Recycle, cls: "text-fresh" },
              { k: "Wasted", v: t.wasted, icon: Trash2, cls: "text-expired" },
              { k: "Saved from expiry", v: t.saved, icon: Leaf, cls: "text-primary" },
            ].map((s) => (
              <div key={s.k} className="rounded-3xl border bg-card p-4">
                <s.icon className={`mb-2 size-5 ${s.cls}`} aria-hidden="true" />
                <dd className="font-display text-3xl font-semibold tabular-nums">{s.v}</dd>
                <dt className="text-xs text-muted-foreground">{s.k}</dt>
              </div>
            ))}
          </dl>

          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard title="Used vs wasted" sub={rate === null ? "Last 6 months" : `${rate}% of what you finished this month was eaten, not binned`}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.usedVsWasted} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" {...axis} />
                  <YAxis allowDecimals={false} {...axis} />
                  <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="used" name="Used" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="wasted" name="Wasted" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Average Nutri-Score of scans" sub="Higher is healthier (A = best)">
              {data.gradeTrend.some((g) => g.avg !== null) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.gradeTrend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" {...axis} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickFormatter={letter} {...axis} />
                    <Tooltip {...tip} formatter={(v) => [`${letter(Number(v))} (${Number(v).toFixed(1)})`, "Avg grade"]} />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      stroke="var(--chart-1)"
                      strokeWidth={3}
                      connectNulls
                      dot={({ cx, cy, payload, index }) => (
                        <circle key={index} cx={cx} cy={cy} r={6} fill={payload.grade ? GRADE_COLORS[payload.grade as keyof typeof GRADE_COLORS] : "var(--muted)"} stroke="var(--card)" strokeWidth={2} />
                      )}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="grid h-60 place-items-center text-sm text-muted-foreground">Scan products with a Nutri-Score to see your trend.</p>
              )}
            </ChartCard>

            <ChartCard title="Ultra-processed share" sub={`NOVA 4 items in your pantry right now (${data.nova4.count} of ${data.nova4.total} with data)`}>
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "NOVA 4", v: data.nova4.count },
                        { name: "Less processed", v: Math.max(0, data.nova4.total - data.nova4.count) },
                      ]}
                      dataKey="v"
                      innerRadius={64}
                      outerRadius={92}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      <Cell fill="var(--chart-3)" />
                      <Cell fill="var(--chart-4)" />
                    </Pie>
                    <Tooltip {...tip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="font-display text-4xl font-semibold">{data.nova4.share}%</p>
                    <p className="text-xs text-muted-foreground">ultra-processed</p>
                  </div>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Where things live" sub="Active pantry items by spot">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byLocation.map((l) => ({ ...l, name: l.loc[0].toUpperCase() + l.loc.slice(1) }))} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <XAxis type="number" allowDecimals={false} {...axis} />
                  <YAxis type="category" dataKey="name" width={64} {...axis} />
                  <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="count" name="Items" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border bg-card p-5" aria-label={title}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{sub}</p>
      {children}
    </section>
  );
}
