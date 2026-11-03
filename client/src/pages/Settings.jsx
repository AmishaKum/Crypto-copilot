import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, LogOut, Mail, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Button, Card, CardHeader, ErrorState, Field, Input, PageHeader, Segmented } from "../components/ui";
import { useTheme } from "../context/ThemeContext";

function useAction() {
  const [state, setState] = useState({ busy: false, error: null, ok: null });
  const run = async (fn, ok) => {
    setState({ busy: true, error: null, ok: null });
    try { await fn(); setState({ busy: false, error: null, ok }); } catch (e) { setState({ busy: false, error: e, ok: null }); }
  };
  return [state, run];
}
const Feedback = ({ s }) => (s.error ? <ErrorState error={s.error} compact /> : s.ok ? <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">{s.ok}</p> : null);

export default function Settings() {
  const { user, update, setUser, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [delPw, setDelPw] = useState("");
  const [profile, runProfile] = useAction();
  const [pass, runPass] = useAction();
  const [danger, runDanger] = useAction();
  const [mailTest, runMailTest] = useAction();
  const emailStatus = useApi("/me/email-status");
  const prefs = user.preferences;

  async function exportData() {
    const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/me/export`, { credentials: "include" });
    const blob = await res.blob();
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "crypto-copilot-data.json" });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader eyebrow="Account" title="Settings" />
      <Card>
        <CardHeader icon={UserRound} title="Profile" sub={user.email} />
        <form onSubmit={(e) => { e.preventDefault(); runProfile(() => update({ name }), "Profile saved."); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1"><Field label="Display name" id="name"><Input id="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></Field></div>
          <Button loading={profile.busy}>Save</Button>
        </form>
        <div className="mt-3"><Feedback s={profile} /></div>
      </Card>

      <Card>
        <CardHeader title="Preferences" />
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-4"><span>Display currency</span>
            <Segmented label="Currency" options={["USD", "INR"]} value={prefs.currency} onChange={(c) => update({ preferences: { currency: c } })} /></div>
          <div className="flex items-center justify-between gap-4"><span>Theme</span>
            <Segmented label="Theme" options={[["dark", "Dark"], ["light", "Light"]]} value={theme} onChange={(t) => t !== theme && toggle()} /></div>
          <label className="flex items-start justify-between gap-4">
            <span><span className="block">Share my virtual portfolio with the AI assistant</span>
              <span className="text-xs text-muted">Sends only simulated balances and P&L (never your name or email) so answers can reference them.</span></span>
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[#f7931a]" checked={prefs.aiIncludePortfolio} onChange={(e) => update({ preferences: { aiIncludePortfolio: e.target.checked } })} />
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader icon={Mail} title="Email notifications" sub={`Sent to ${user.email}`} />
        <label className="flex items-start justify-between gap-4 text-sm">
          <span><span className="block">Email me when an alert is triggered</span>
            <span className="text-xs text-muted">One email each time an alert's condition becomes true. In-app alerts keep working either way.</span></span>
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[#f7931a]" checked={!!prefs.emailAlerts} onChange={(e) => update({ preferences: { emailAlerts: e.target.checked } })} aria-label="Email me when an alert is triggered" />
        </label>
        {emailStatus.data && !emailStatus.data.configured && (
          <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            Email sending isn't configured on this server yet (SMTP settings in server/.env), so emails are printed in the server terminal instead.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" loading={mailTest.busy}
            onClick={() => runMailTest(() => api("/me/test-email", { method: "POST" }), "Test email sent. Check your inbox (or the server terminal if email isn't configured).")}>
            <Mail size={14} /> Send test email
          </Button>
          <Feedback s={mailTest} />
        </div>
      </Card>

      <Card>
        <CardHeader icon={ShieldCheck} title="Security" />
        <form onSubmit={(e) => { e.preventDefault(); runPass(async () => { await api("/me/password", { body: pw }); setPw({ currentPassword: "", newPassword: "" }); }, "Password changed. Other sessions were logged out."); }} className="grid gap-3 sm:grid-cols-2">
          <Field label="Current password" id="cpw"><Input id="cpw" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
          <Field label="New password" id="npw" hint="8+ characters, a letter and a number"><Input id="npw" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button loading={pass.busy} disabled={!pw.currentPassword || !pw.newPassword}>Change password</Button>
            <Button type="button" variant="ghost" onClick={async () => { await api("/auth/logout-all", { method: "POST" }).catch(() => {}); setUser(null); navigate("/login"); }}><LogOut size={14} /> Log out everywhere</Button>
          </div>
        </form>
        <div className="mt-3"><Feedback s={pass} /></div>
      </Card>

      <Card>
        <CardHeader title="Your data" sub="Download everything we store about you, or delete it permanently." />
        <Button variant="ghost" onClick={exportData}><Download size={14} /> Download my data (JSON)</Button>
        <form onSubmit={(e) => { e.preventDefault(); runDanger(async () => { await api("/me", { method: "DELETE", body: { password: delPw } }); await logout(); navigate("/"); }); }} className="mt-6 space-y-3 rounded-xl border border-rose-500/30 p-4">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Delete account</p>
          <p className="text-xs text-muted">Permanently deletes your account, virtual portfolio, trades, alerts and learning progress. This can't be undone.</p>
          <Field label="Confirm with your password" id="dpw"><Input id="dpw" type="password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} /></Field>
          <Button variant="danger" loading={danger.busy} disabled={!delPw}><Trash2 size={14} /> Delete my account</Button>
          <Feedback s={danger} />
        </form>
      </Card>
    </div>
  );
}
