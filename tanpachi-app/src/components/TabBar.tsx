import { NavLink } from "react-router-dom";
import { startLearnBgm, startSlotBgm } from "../lib/sfx";
import { Book, Grid, Home, Menu, Pachinko } from "./Icons";

const TABS = [
  { to: "/home", label: "ホーム", Icon: Home },
  { to: "/learn", label: "しっかり勉強", Icon: Book },
  { to: "/pachinko", label: "サクッと勉強", Icon: Pachinko },
  { to: "/words", label: "図鑑", Icon: Grid },
  { to: "/menu", label: "その他", Icon: Menu },
];

// スマホ（特に iPhone）はタップの瞬間に再生しないと音が鳴らないので、画面を開くタップでBGMを始める
const START_BGM: Record<string, () => void> = {
  "/learn": startLearnBgm,
  "/pachinko": startSlotBgm,
};

export function TabBar() {
  return (
    <nav className="tab-bar">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => (isActive ? "active" : "")}
          onClick={START_BGM[to]}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
