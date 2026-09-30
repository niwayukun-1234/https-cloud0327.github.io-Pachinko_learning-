import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Device } from "./components/Device";
import { SettingsMenu } from "./components/SettingsMenu";
import { Welcome } from "./pages/Welcome/Welcome";
import { Home } from "./pages/Home/Home";
import { Learn } from "./pages/Learn/Learn";
import { Correct } from "./pages/Correct/Correct";
import { Fail } from "./pages/Fail/Fail";
import { Result } from "./pages/Result/Result";
import { PachinkoMode } from "./pages/PachinkoMode/PachinkoMode";
import { Rewards } from "./pages/Rewards/Rewards";
import { Words } from "./pages/Words/Words";
import { Records } from "./pages/Records/Records";
import { MyPage } from "./pages/MyPage/MyPage";
import { MenuPage } from "./pages/MenuPage/MenuPage";
import { Login } from "./pages/Login/Login";
import { BallHistory } from "./pages/BallHistory/BallHistory";
import { useSettings } from "./lib/settings";
import { pauseIdleBgm, startIdleBgm } from "./lib/sfx";

// 自前の音楽・効果音がある画面（ここ以外ではフリーBGMを流す）
const HAS_OWN_MUSIC = ["/learn", "/pachinko"];

export default function App() {
  const { brightness, sound } = useSettings();
  const { pathname } = useLocation();
  const idle = !HAS_OWN_MUSIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // 起動時や音楽がない画面ではフリーBGMをループ再生する（学習・パチンコ画面では止める）
  useEffect(() => {
    if (!idle || !sound) {
      pauseIdleBgm();
      return;
    }
    startIdleBgm();
    // 起動直後はタップするまで音を出せないブラウザが多いので、最初のタップで再生し直す
    const kick = () => startIdleBgm();
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, [idle, sound]);

  // 明るさ設定をアプリ全体に反映（CSS 変数 + filter）
  useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty("--app-brightness", String(brightness));
    el.style.setProperty("--app-brightness-filter", `brightness(${brightness})`);
  }, [brightness]);

  return (
    <Device
      overlay={<SettingsMenu />}
    >
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/correct" element={<Correct />} />
        <Route path="/learn/fail" element={<Fail />} />
        <Route path="/result" element={<Result />} />
        <Route path="/pachinko" element={<PachinkoMode />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/words" element={<Words />} />
        <Route path="/records" element={<Records />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/history" element={<BallHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Device>
  );
}