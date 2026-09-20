import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Close, Menu } from "./Icons";
import {
  closeMenu,
  resetSettings,
  setSettings,
  toggleMenu,
  useMenuOpen,
  useSettings,
} from "../lib/settings";
import "./SettingsMenu.css";

const BRIGHTNESS_STEPS = [0.6, 0.8, 1, 1.2, 1.4];

// 演出中・起動画面ではハンバーガーを表示しない
const HIDDEN_ROUTES = ["/", "/learn/correct", "/learn/fail"];

/** 右上のハンバーガーから開く、演出設定メニュー */
export function SettingsMenu() {
  const open = useMenuOpen();
  const settings = useSettings();
  const { pathname } = useLocation();
  const [toast, setToast] = useState<string | null>(null);
  const hidden = HIDDEN_ROUTES.includes(pathname);

  // ルートが変わったらメニューを閉じる
  useEffect(() => {
    closeMenu();
  }, [pathname]);

  // メニューを開いている間は後ろのスクロールを止める
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1200);
  };

  if (hidden) return null;

  return (
    <>
      <button
        className={`settings-fab${open ? " open" : ""}`}
        aria-label="演出設定"
        aria-expanded={open}
        onClick={() => toggleMenu()}
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="settings-layer" role="dialog" aria-label="演出設定">
          <button className="settings-backdrop" aria-label="閉じる" onClick={() => toggleMenu()} />
          <div className="settings-sheet">
            <div className="settings-head">
              <span className="settings-title">演出設定</span>
              <button className="icon-btn" aria-label="閉じる" onClick={() => toggleMenu()}>
                <Close size={20} />
              </button>
            </div>

            {/* 演出の音 */}
            <div className="settings-row">
              <div className="settings-label">
                <span>演出の音</span>
                <small>正解・確変・外れの効果音</small>
              </div>
              <button
                className={`switch${settings.sound ? " on" : ""}`}
                role="switch"
                aria-checked={settings.sound}
                aria-label="演出の音"
                onClick={() => {
                  setSettings({ sound: !settings.sound });
                  flash(settings.sound ? "音をオフにしました" : "音をオンにしました");
                }}
              >
                <span className="knob" />
              </button>
            </div>

            {/* 明るさ */}
            <div className="settings-row column">
              <div className="settings-label">
                <span>明るさ</span>
                <small>{Math.round(settings.brightness * 100)}%</small>
              </div>
              <div className="brightness-bar" role="group" aria-label="明るさ">
                {BRIGHTNESS_STEPS.map((b) => (
                  <button
                    key={b}
                    className={`brightness-dot${Math.abs(settings.brightness - b) < 0.01 ? " on" : ""}`}
                    style={{ opacity: 0.4 + b * 0.45 }}
                    aria-label={`明るさ ${Math.round(b * 100)}%`}
                    onClick={() => setSettings({ brightness: b })}
                  />
                ))}
              </div>
            </div>

            {/* 確変 */}
            <div className="settings-row">
              <div className="settings-label">
                <span>確変（ラッシュ）</span>
                <small>オフにすると確変が発生しません</small>
              </div>
              <button
                className={`switch${settings.kakuhenEnabled ? " on" : ""}`}
                role="switch"
                aria-checked={settings.kakuhenEnabled}
                aria-label="確変の有無"
                onClick={() => {
                  setSettings({ kakuhenEnabled: !settings.kakuhenEnabled });
                  flash(
                    settings.kakuhenEnabled ? "確変をオフにしました" : "確変をオンにしました",
                  );
                }}
              >
                <span className="knob" />
              </button>
            </div>

            <button
              className="settings-reset"
              onClick={() => {
                resetSettings();
                flash("設定を初期化しました");
              }}
            >
              初期設定に戻す
            </button>
          </div>

          {toast && <div className="settings-toast fade-up">{toast}</div>}
        </div>
      )}
    </>
  );
}
