import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApi } from "../lib/useApi";
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, Stat } from "../components/ui";

export default function Admin() {
  const { data: d, error, loading, reload } = useApi("/admin/stats", { refreshMs: 120_000 });
  if (loading) return <Skeleton className="h-80" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Platform overview">Aggregate, real counts from the database. No personal data is shown.</PageHeader>
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          <Stat label="Users" value={d.users.toLocaleString()} sub={`+${d.newUsers7d} in 7 days`} />
          <Stat label="Active (7d)" value={d.activeUsers7d.toLocaleString()} sub="Logged in this week" />
          <Stat label="Simulated trades" value={d.trades.toLocaleString()} sub={`${d.trades7d} in 7 days`} />
          <Stat label="Alerts" value={d.alerts.toLocaleString()} sub={`${d.activeAlerts} enabled`} />
          <Stat label="Lessons completed" value={d.completions.toLocaleString()} />
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sign-ups per day" sub="Last 30 days" />
          {!d.signupsByDay.length ? <EmptyState title="No sign-ups in the last 30 days" /> : (
            <div className="h-56" role="img" aria-label="Sign-ups per day over the last 30 days">
              <ResponsiveContainer>
                <BarChart data={d.signupsByDay}>
                  <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "rgb(var(--line) / .4)" }} />
                  <Bar dataKey="count" name="Sign-ups" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Academy engagement" />
          {!d.lessons.length ? <EmptyState title="No quiz attempts yet" /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="py-1.5 font-medium">Lesson</th><th className="text-right font-medium">Completed</th><th className="text-right font-medium">Avg best score</th></tr></thead>
              <tbody className="divide-y divide-line">
                {d.lessons.map((l) => <tr key={l.id}><td className="py-2">{l.title}</td><td className="num text-right">{l.completed}</td><td className="num text-right">{l.avgScore}%</td></tr>)}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
