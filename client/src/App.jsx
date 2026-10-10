import { Route, Routes } from "react-router-dom";
import Layout, { NAV } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ComingSoon from "./pages/ComingSoon";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        {NAV.filter((n) => !n.ready).map((n) => (
          <Route key={n.to} path={n.to} element={<ComingSoon title={n.label} />} />
        ))}
        <Route path="*" element={<ComingSoon title="Page not found" />} />
      </Route>
    </Routes>
  );
}
