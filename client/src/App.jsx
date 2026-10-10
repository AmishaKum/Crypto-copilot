import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import AppLayout from "./components/AppLayout";
import { FullPageLoader, RequireAdmin, RequireAuth } from "./components/RouteGuards";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Legal from "./pages/Legal";
import NotFound from "./pages/NotFound";

// App pages are code-split so the public landing page loads fast.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Explorer = lazy(() => import("./pages/Explorer"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Risk = lazy(() => import("./pages/Risk"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Academy = lazy(() => import("./pages/Academy"));
const Lesson = lazy(() => import("./pages/Lesson"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="legal/:doc" element={<Legal />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="app" element={<RequireAuth />}>
        <Route element={<Suspense fallback={<FullPageLoader />}><AppLayout /></Suspense>}>
          <Route index element={<Dashboard />} />
          <Route path="explorer" element={<Explorer />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="risk" element={<Risk />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="academy" element={<Academy />} />
          <Route path="academy/:id" element={<Lesson />} />
          <Route path="settings" element={<Settings />} />
          <Route element={<RequireAdmin />}><Route path="admin" element={<Admin />} /></Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
