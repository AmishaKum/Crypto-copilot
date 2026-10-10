import { Link } from "react-router-dom";
import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { useApi } from "../lib/useApi";
import { Badge, Card, ErrorState, PageHeader, Skeleton } from "../components/ui";

export default function Academy() {
  const { data, error, loading, reload } = useApi("/academy/lessons");
  const done = data?.lessons.filter((l) => l.progress?.completed).length ?? 0;
  const total = data?.lessons.length ?? 0;
  return (
    <div>
      <PageHeader eyebrow="Crypto Academy" title="Learn Bitcoin, one lesson at a time">
        Short lessons with quizzes. Score {data?.passPct ?? 70}% or more to complete a lesson.
      </PageHeader>
      {data && (
        <Card className="mb-4">
          <div className="flex items-center justify-between text-sm"><span className="font-medium">Your progress</span><span className="num">{done}/{total} completed</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Lessons completed">
            <div className="h-full rounded-full bg-btc transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </Card>
      )}
      {loading ? <Skeleton className="h-64" /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.lessons.map((l) => (
            <Link key={l.id} to={`/app/academy/${l.id}`} className="group">
              <Card className={`h-full transition group-hover:border-btc/50 ${l.kind === "scam" ? "border-btc/40" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {l.kind === "scam" ? <Badge tone="btc"><ShieldAlert size={12} /> Scam dojo</Badge> : <Badge>{l.level}</Badge>}
                  <span className="flex items-center gap-1 text-xs text-muted"><Clock size={12} /> {l.minutes} min · {l.questionCount} questions</span>
                </div>
                <h2 className="mt-3 font-semibold">{l.title}</h2>
                <p className="mt-1 text-sm text-muted">{l.summary}</p>
                <div className="mt-4 text-xs">
                  {l.progress?.completed ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={14} /> Completed · best {l.progress.bestScore}%</span>
                    : l.progress ? <span className="text-muted">Best score {l.progress.bestScore}%, keep going</span> : <span className="text-btc">Start lesson →</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
