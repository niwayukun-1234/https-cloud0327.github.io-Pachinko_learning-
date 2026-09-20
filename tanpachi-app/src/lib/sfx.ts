import { getSettings } from "./settings";
import kakuhenBgmSrc from "../assets/kakuhen-bgm.mp3";

// 再生中の効果音を保持。画面遷移後も鳴らし続け、次の音と重ならないようにする。
let currentSfx: HTMLAudioElement | null = null;

/** 音源ファイルを再生する（前の音は止めて重ならないようにする） */
export function playSfx(src: string): HTMLAudioElement {
  if (currentSfx) {
    currentSfx.pause();
    currentSfx = null;
  }
  const audio = new Audio(src);
  audio.volume = 1;
  currentSfx = audio;
  // 設定で「演出の音」がオフなら鳴らさない（'ended' は発火せず保険タイマーで進む）
  if (getSettings().sound) {
    void audio.play().catch(() => {
      /* 自動再生がブロックされた環境では無視 */
    });
  }
  return audio;
}

/** 再生中の演出音を停止する（演出が終わったら呼ぶ） */
export function stopSfx(): void {
  if (currentSfx) {
    currentSfx.pause();
    currentSfx.currentTime = 0;
    currentSfx = null;
  }
}

/** 追加ボーナス用のファンファーレ。level(1〜4) が高いほど音数と音量が増えて派手になる */
export function playBonus(level: number): void {
  // 設定で「演出の音」がオフなら鳴らさない
  if (!getSettings().sound) return;
  const ac = getCtx();
  if (!ac) return;
  const lv = Math.max(1, Math.min(4, Math.round(level)));
  const t0 = ac.currentTime + 0.02;

  const master = ac.createGain();
  master.gain.value = 0.4 + lv * 0.07; // レベルが高いほど大きい
  master.connect(ac.destination);

  // 上昇するアルペジオ（レベルが高いほど音数が増える）
  const scales = [
    [523.25, 659.25, 783.99], // C5 E5 G5
    [523.25, 659.25, 783.99, 1046.5], // +C6
    [523.25, 659.25, 783.99, 1046.5, 1318.5], // +E6
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98], // +G6
  ];
  const notes = scales[lv - 1];
  const step = 0.085;
  notes.forEach((f, i) => {
    const t = t0 + i * step;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = lv >= 4 ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.36);
  });

  // 高レベルは最後に「ジャーン」と和音の余韻を重ねる
  if (lv >= 3) {
    const t = t0 + notes.length * step;
    const chord = lv >= 4 ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(lv >= 4 ? 0.34 : 0.28, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (lv >= 4 ? 1.3 : 1.0));
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + 1.4);
    });
  }
}

// 外れっぽい効果音を Web Audio で合成する（追加アセット不要）。
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const C =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** サッドトロンボーン風の下降音（外れ演出用） */
export function playMiss(): void {
  // 設定で「演出の音」がオフなら鳴らさない
  if (!getSettings().sound) return;
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + 0.03;

  // 下降する4音（最後だけ長く、しょんぼり下げる）
  const notes = [392, 370, 349, 311]; // G4, F#4, F4, Eb4
  const durs = [0.22, 0.22, 0.22, 0.95];
  const master = ac.createGain();
  master.gain.value = 0.5;
  master.connect(ac.destination);

  let t = t0;
  notes.forEach((f, i) => {
    const last = i === notes.length - 1;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const lp = ac.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(f, t);
    if (last) osc.frequency.linearRampToValueAtTime(f * 0.9, t + durs[i]);

    lp.type = "lowpass";
    lp.frequency.value = 1600;
    lp.Q.value = 6;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durs[i] * 0.96);

    osc.connect(lp).connect(g).connect(master);
    osc.start(t);
    osc.stop(t + durs[i] + 0.03);
    t += durs[i] * 0.88;
  });

  // 沈み込む低音（ブザーの余韻）
  const sub = ac.createOscillator();
  const subGain = ac.createGain();
  sub.type = "square";
  sub.frequency.setValueAtTime(110, t0);
  sub.frequency.exponentialRampToValueAtTime(60, t0 + 1.6);
  subGain.gain.setValueAtTime(0.0001, t0);
  subGain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.05);
  subGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.7);
  sub.connect(subGain).connect(master);
  sub.start(t0);
  sub.stop(t0 + 1.8);
}

/* ---------- 確変中のBGM（添付音声をループ再生） ---------- */

let bgm: HTMLAudioElement | null = null;

/**
 * 確変中のBGMをループ再生する。
 * 設定で「演出の音」がオフのときは鳴らさない（既に再生中なら何もしない）。
 */
export function startKakuhenBgm(): void {
  if (!getSettings().sound) return;
  if (!bgm) {
    bgm = new Audio(kakuhenBgmSrc);
    bgm.loop = true;
    bgm.volume = 0.75;
  }
  if (bgm.paused) {
    void bgm.play().catch(() => {
      /* 自動再生がブロックされた環境では無視 */
    });
  }
}

/** 確変BGMを停止する（確変が終わったとき・画面を離れるときに呼ぶ） */
export function stopKakuhenBgm(): void {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
}
