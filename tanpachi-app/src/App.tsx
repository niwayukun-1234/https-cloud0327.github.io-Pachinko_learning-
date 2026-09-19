import { Navigate, Route, Routes } from "react-router-dom";
import { Device } from "./components/Device";
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

export default function App() {
  return (
    <Device>
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
    </Device>
  );
}
