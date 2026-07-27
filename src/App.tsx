import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Feeding from "./pages/Feeding";
import Growth from "./pages/Growth";
import Assistant from "./pages/Assistant";
import Settings from "./pages/Settings";
import {
  IconBottle,
  IconChart,
  IconGear,
  IconHome,
  IconPerson,
  IconSpark,
} from "./components/icons";

const NAV = [
  { to: "/dashboard", Icon: IconHome, label: "今日" },
  { to: "/feeding", Icon: IconBottle, label: "喂养" },
  { to: "/growth", Icon: IconChart, label: "成长" },
  { to: "/assistant", Icon: IconSpark, label: "助手" },
  { to: "/settings", Icon: IconGear, label: "设置" },
] as const;

function AppBar(): JSX.Element {
  const { pathname } = useLocation();
  const title = NAV.find((n) => pathname.startsWith(n.to))?.label ?? "响当当";
  return (
    <header className="appbar">
      <div className="appbar-inner">
        <span className="appbar-title">{title}</span>
        <NavLink to="/settings" className="appbar-avatar" aria-label="设置">
          <IconPerson />
        </NavLink>
      </div>
    </header>
  );
}

export default function App(): JSX.Element {
  return (
    <div className="app">
      <AppBar />

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/feeding" element={<Feeding />} />
        <Route path="/growth" element={<Growth />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <nav className="nav">
        {NAV.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <span className="ico">
              <Icon />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
