import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Device } from "./components/Device";
import { SettingsMenu } from "./components/SettingsMenu";
import { Welcome } from "./pages/Welcome/Welcome";
import { Home } from "./pages/Home/Home";
import { Learn } from "./pages/Learn/Learn";
import { Correct } from "./pages/Correct/Correct";
import { Fail } from "./pages/Fail/Fail";
import { PachinkoMode } from "./pages/PachinkoMode/PachinkoMode";
import { Rewards } from "./pages/Rewards/Rewards";
import { Words } from "./pages/Words/Words";
import { Records } from "./pages/Records/Records";
import { MyPage } from "./pages/MyPage/MyPage";
import { MenuPage } from "./pages/MenuPage/MenuPage";
import { BallHistory } from "./pages/BallHistory/BallHistory";
import { useSettings } from "./lib/settings";

export default function App() {
  const { brightness } = useSettings();

  // 明るさ設定をアプリ全体に反映（CSS 変数 + filter）
  useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty("--app-brightness", String(brightness));
    el.style.setProperty("--app-brightness-filter", `brightness(${brightness})`);
  }, [brightness]);

  return (
    <Device
      overlay={
        <>
          {/* 右上のハンバーガーから開く演出設定 */}
          <SettingsMenu />
        </>
      }
    >
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/home" element={<Home />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/correct" element={<Correct />} />
        <Route path="/learn/fail" element={<Fail />} />
        <Route path="/pachinko" element={<PachinkoMode />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/words" element={<Words />} />
        <Route path="/records" element={<Records />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/history" element={<BallHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* 右上のハンバーガーから開く演出設定 */}
      <SettingsMenu />
    </Device>
  );
}