import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { timeAgo } from "../lib/format";

export const cx = (...c) => c.filter(Boolean).join(" ");

export function Card({ className, children, ...p }) {
  return <section className={cx("card", className)} {...p}>{children}</section>;
}

export function CardHeader({ title, icon: Icon, action, sub }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          {Icon && <Icon size={16} className="text-btc" aria-hidden />} {title}
        </h2>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({ variant = "primary", size = "md", loading, className, children, ...p }) {
  const v = {
    primary: "bg-btc text-navy-950 hover:bg-btc-soft font-semibold",
    ghost: "border border-line hover:border-btc hover:text-btc",
    danger: "bg-rose-600 text-white hover:bg-rose-500 font-semibold",
    subtle: "text-muted hover:text-ink",
  }[variant];
  const s = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" }[size];
  return (
    <button className={cx("inline-flex items-center justify-center gap-2 rounded-xl transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-btc", v, s, className)}
      disabled={loading || p.disabled} {...p}>
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden />} {children}
    </button>
  );
}

export function Field({ label, hint, error, id, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {children}
      {error ? <p className="text-xs text-rose-500" role="alert">{error}</p> : hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const inputCls = "h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none transition placeholder:text-muted focus:border-btc focus:ring-2 focus:ring-btc/20";
export const Input = ({ className, ...p }) => <input className={cx(inputCls, className)} {...p} />;
export const Select = ({ className, children, ...p }) => <select className={cx(inputCls, className)} {...p}>{children}</select>;

export function Badge({ tone = "neutral", children, className }) {
  const t = {
    neutral: "bg-slate-500/10 text-muted",
    up: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    down: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    btc: "bg-btc/10 text-btc-deep dark:text-btc",
    warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", t, className)}>{children}</span>;
}

export const Skeleton = ({ className }) => <div className={cx("animate-pulse rounded-lg bg-slate-200 dark:bg-navy-700", className)} aria-hidden />;

export function ErrorState({ error, onRetry, compact }) {
  const msg = typeof error === "string" ? error : error?.message;
  return (
    <div role="alert" className={cx("flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-sm", compact ? "p-3" : "p-4")}>
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" aria-hidden />
      <div className="flex-1">
        <p>{msg || "Something went wrong."}</p>
        {onRetry && <button onClick={onRetry} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-btc hover:underline"><RefreshCw size={12} /> Try again</button>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-center">
      <Icon size={22} className="text-muted" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="max-w-sm text-xs text-muted">{children}</div>}
    </div>
  );
}

/** Shows where data came from and how fresh it is. */
export function SourceTag({ source, at, stale, className }) {
  if (!source) return null;
  return (
    <p className={cx("flex items-center gap-1.5 text-[11px] text-muted", className)}>
      <span className={cx("h-1.5 w-1.5 rounded-full", stale ? "bg-amber-500" : "bg-emerald-500")} aria-hidden />
      {source} · {stale ? "stale data, " : ""}updated {timeAgo(at)}
    </p>
  );
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className="min-w-0">
      <p className="label">{label}</p>
      <p className={cx("num mt-1 truncate text-lg font-semibold", tone === "up" && "text-emerald-600 dark:text-emerald-400", tone === "down" && "text-rose-600 dark:text-rose-400")}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

export const toneOf = (n) => (n == null ? undefined : n >= 0 ? "up" : "down");

export function PageHeader({ eyebrow, title, children, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="label">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {children && <p className="mt-1 max-w-2xl text-sm text-muted">{children}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl border border-line p-0.5 text-xs">
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return (
          <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
            className={cx("rounded-lg px-2.5 py-1.5 font-medium transition", value === v ? "bg-btc text-navy-950" : "text-muted hover:text-ink")}>{l}</button>
        );
      })}
    </div>
  );
}
