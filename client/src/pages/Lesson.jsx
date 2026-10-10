import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useApi } from "../lib/useApi";
import { api } from "../lib/api";
import { Badge, Button, Card, ErrorState, Skeleton, cx } from "../components/ui";

export default function Lesson() {
  const { id } = useParams();
  const { data, error, loading } = useApi(`/academy/lessons/${id}`);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  if (loading) return <Skeleton className="h-96" />;
  if (error) return <ErrorState error={error} />;
  const { lesson, passPct } = data;
  const complete = lesson.quiz.every((_, i) => answers[i] != null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { setResult(await api(`/academy/lessons/${id}/submit`, { body: { answers: lesson.quiz.map((_, i) => answers[i]) } })); }
    catch (x) { setErr(x); } finally { setBusy(false); }
  }
  const retry = () => { setAnswers({}); setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <article className="mx-auto max-w-2xl">
      <Link to="/app/academy" className="link inline-flex items-center gap-1 text-sm"><ArrowLeft size={14} /> All lessons</Link>
      <div className="mt-4 flex gap-2"><Badge tone={lesson.kind === "scam" ? "btc" : "neutral"}>{lesson.kind === "scam" ? "Scam dojo" : lesson.level}</Badge><Badge>{lesson.minutes} min</Badge></div>
      <h1 className="mt-3 font-display text-3xl font-bold">{lesson.title}</h1>
      <p className="mt-2 text-muted">{lesson.summary}</p>
      <div className="mt-6 space-y-5">
        {lesson.sections.map((s) => (
          <section key={s.heading}><h2 className="font-semibold">{s.heading}</h2><p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p></section>
        ))}
      </div>

      <form onSubmit={submit} className="mt-10 space-y-4">
        <h2 className="font-display text-xl font-bold">{lesson.kind === "scam" ? "Spot the scam" : "Quiz"}</h2>
        {lesson.quiz.map((q, i) => {
          const r = result?.results[i];
          return (
            <Card key={i}>
              <fieldset>
                <legend className="mb-3 text-sm font-medium">{i + 1}. {q.q}</legend>
                <div className="space-y-2">
                  {q.options.map((o, j) => {
                    const chosen = answers[i] === j;
                    const state = r ? (j === r.correctAnswer ? "correct" : chosen ? "wrong" : null) : null;
                    return (
                      <label key={j} className={cx("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                        state === "correct" ? "border-emerald-500/50 bg-emerald-500/10" : state === "wrong" ? "border-rose-500/50 bg-rose-500/10" : chosen ? "border-btc bg-btc/5" : "border-line hover:border-btc/50")}>
                        <input type="radio" name={`q${i}`} checked={chosen} disabled={!!result} onChange={() => setAnswers({ ...answers, [i]: j })} className="accent-[#f7931a]" />
                        <span className="flex-1">{o}</span>
                        {state === "correct" && <CheckCircle2 size={16} className="text-emerald-500" aria-label="Correct answer" />}
                        {state === "wrong" && <XCircle size={16} className="text-rose-500" aria-label="Your incorrect answer" />}
                      </label>
                    );
                  })}
                </div>
                {r && <p className="mt-3 text-xs text-muted"><strong className="text-ink">{r.correct ? "Correct." : "Not quite."}</strong> {r.explain}</p>}
              </fieldset>
            </Card>
          );
        })}
        {err && <ErrorState error={err} compact />}
        {result ? (
          <Card className={result.passed ? "border-emerald-500/40" : "border-amber-500/40"} role="status">
            <p className="font-display text-2xl font-bold">{result.score}%</p>
            <p className="text-sm text-muted">{result.passed ? `Lesson complete! Best score: ${result.progress.bestScore}%.` : `You need ${passPct}% to complete this lesson. Review the explanations and try again.`}</p>
            <div className="mt-4 flex gap-2"><Button type="button" variant="ghost" onClick={retry}>Try again</Button><Link to="/app/academy" className="inline-flex h-10 items-center rounded-xl bg-btc px-4 text-sm font-semibold text-navy-950">Next lesson</Link></div>
          </Card>
        ) : <Button type="submit" loading={busy} disabled={!complete} className="w-full">{complete ? "Submit answers" : "Answer every question to submit"}</Button>}
      </form>
    </article>
  );
}
