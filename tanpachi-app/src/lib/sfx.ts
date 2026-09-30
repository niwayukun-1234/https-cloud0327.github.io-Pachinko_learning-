import { getSettings } from "./settings";
import kakuhenBgmSrc from "../assets/kakuhen-bgm.mp3";
import slotBgmSrc from "../assets/slot-bgm.mp3";
import learnBgmSrc from "../assets/learn-bgm.m4a";
// 「ジャックポット」written by カピバラっ子（OpenTracks／旧DOVA-SYNDROME のフリーBGM）
// https://opentracks.com/bgm/detail/18020
import idleBgmSrc from "../assets/idle-bgm.mp3";

import correctSfxSrc from "../assets/correct.mp3";
import tripleSfxSrc from "../assets/triple.mp3";
import kakuhenSfxSrc from "../assets/kakuhen.mp3";

// 再生中の効果音を保持。画面遷移後も鳴らし続け、次の音と重ならないようにする。
let currentSfx: HTMLAudioElement | null = null;

// 効果音ごとに audio 要素を1つだけ作って使い回す。
// スマホ（特に iPhone）は「タップで一度再生したことのある要素」しか後から鳴らせないため、
// 新しく作り直すと、画面が切り替わった後の正解音などが鳴らなくなる。
const sfxCache = new Map<string, HTMLAudioElement>();
// 再生を許可された（タップ中に一度再生した）要素
const unlocked = new WeakSet<HTMLAudioElement>();
// playSfx で鳴らしている最中の要素（アンロック処理で止めないようにする）
const wanted = new WeakSet<HTMLAudioElement>();

function getSfx(src: string): HTMLAudioElement {
  let audio = sfxCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = "auto";
    audio.addEventListener("ended", () => wanted.delete(audio!));
    sfxCache.set(src, audio);
  }
  return audio;
}

/** 音源ファイルを再生する（前の音は止めて重ならないようにする） */
export function playSfx(src: string): HTMLAudioElement {
  if (currentSfx) {
    wanted.delete(currentSfx);
    currentSfx.pause();
    currentSfx = null;
  }
  const audio = getSfx(src);
  audio.muted = false;
  audio.volume = 1;
  audio.currentTime = 0;
  currentSfx = audio;
  // 設定で「演出の音」がオフなら鳴らさない（'ended' は発火せず保険タイマーで進む）
  if (getSettings().sound) {
    wanted.add(audio);
    void audio.play().catch(() => {
      /* 自動再生がブロックされた環境では無視 */
    });
  }
  return audio;
}

/** 再生中の演出音を停止する（演出が終わったら呼ぶ） */
export function stopSfx(): void {
  if (currentSfx) {
    wanted.delete(currentSfx);
    currentSfx.pause();
    currentSfx.currentTime = 0;
    currentSfx = null;
  }
}

/**
 * タップの瞬間に、後で鳴らす効果音（正解・3連続・確変）と合成音を「再生許可済み」にしておく。
 * 無音で一瞬だけ再生してすぐ止めるので、聞こえる音は出ない。
 */
function unlockSfx(): void {
  getCtx();
  for (const src of [correctSfxSrc, tripleSfxSrc, kakuhenSfxSrc]) {
    const audio = getSfx(src);
    if (unlocked.has(audio) || !audio.paused) continue;
    unlocked.add(audio);
    audio.muted = true;
    audio
      .play()
      .then(() => {
        // アンロック中に本番の再生が始まっていたら止めない
        if (!wanted.has(audio)) {
          audio.pause();
          audio.currentTime = 0;
        }
        audio.muted = false;
      })
      .catch(() => {
        audio.muted = false;
        unlocked.delete(audio);
      });
  }
}

// アプリ全体で、タップ（キー操作）のたびに未許可の効果音を許可しておく
if (typeof window !== "undefined") {
  for (const type of ["touchend", "click", "keydown"]) {
    window.addEventListener(type, unlockSfx, { capture: true, passive: true });
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

/* ---------- この画面を開いていないとき（別タブ・別アプリ・別ウィンドウ）は音楽を止める ---------- */

// 画面を離れたときに止めたBGM。戻ってきたら続きから再開する。
const heldBgms = new Set<HTMLAudioElement>();

// 別のウィンドウやアプリに切り替えた（ウィンドウのフォーカスが外れた）状態か
let windowBlurred = false;

/** この画面が前面に出ていて、操作できる状態か */
function isForeground(): boolean {
  return document.visibilityState === "visible" && !windowBlurred;
}

/** BGMを再生する。画面を離れている間は鳴らさず、戻ったときに再生する */
function playBgm(audio: HTMLAudioElement): void {
  if (!isForeground()) {
    heldBgms.add(audio);
    return;
  }
  heldBgms.delete(audio);
  if (audio.paused) {
    void audio.play().catch(() => {
      /* 自動再生がブロックされた環境では無視（最初のタップで再試行する） */
    });
  }
}

/** BGMを止める（画面側から止めたものは、戻ってきても再開しない） */
function pauseBgm(audio: HTMLAudioElement): void {
  heldBgms.delete(audio);
  audio.pause();
}

function holdAllBgm(): void {
  for (const audio of [bgm, slotBgm, learnBgm, idleBgm]) {
    if (audio && !audio.paused) {
      audio.pause();
      heldBgms.add(audio);
    }
  }
}

function resumeHeldBgm(): void {
  if (!isForeground()) return;
  const list = [...heldBgms];
  heldBgms.clear();
  // 離れている間に「演出の音」がオフにされていたら再開しない
  if (!getSettings().sound) return;
  for (const audio of list) playBgm(audio);
}

if (typeof window !== "undefined") {
  const sync = () => (isForeground() ? resumeHeldBgm() : holdAllBgm());
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("blur", () => {
    windowBlurred = true;
    sync();
  });
  // 画面をタップしたときも「戻ってきた」とみなす（focus が来ない環境向け）
  for (const type of ["focus", "pointerdown", "keydown"]) {
    window.addEventListener(
      type,
      () => {
        windowBlurred = false;
        sync();
      },
      { capture: true },
    );
  }
  window.addEventListener("pagehide", holdAllBgm);
  window.addEventListener("pageshow", sync);
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
  playBgm(bgm);
}

/** 確変BGMを停止する（確変が終わったとき・画面を離れるときに呼ぶ） */
export function stopKakuhenBgm(): void {
  if (!bgm) return;
  pauseBgm(bgm);
  bgm.currentTime = 0;
}

/* ---------- パチンコ（スロット）遊技中のBGM（添付音声をループ再生） ---------- */

let slotBgm: HTMLAudioElement | null = null;

/** スロット遊技中のBGMをループ再生する（既に再生中なら何もしない） */
export function startSlotBgm(): void {
  if (!slotBgm) {
    slotBgm = new Audio(slotBgmSrc);
    slotBgm.loop = true;
    slotBgm.volume = 0.45;
  }
  playBgm(slotBgm);
}

/** 一時停止する（タブが非表示になったとき等。次に再開したときは続きから） */
export function pauseSlotBgm(): void {
  if (!slotBgm) return;
  pauseBgm(slotBgm);
}

/** 停止して先頭に戻す（音声OFFにしたとき・画面を離れるときに呼ぶ） */
export function stopSlotBgm(): void {
  if (!slotBgm) return;
  pauseBgm(slotBgm);
  slotBgm.currentTime = 0;
}

/* ---------- 学習（単語の問題）中のBGM（添付音声をループ再生） ---------- */

let learnBgm: HTMLAudioElement | null = null;

/**
 * 単語の問題を出している間のBGMをループ再生する（既に再生中なら何もしない）。
 * 設定で「演出の音」がオフのときは鳴らさない。
 */
export function startLearnBgm(): void {
  if (!getSettings().sound) return;
  if (!learnBgm) {
    learnBgm = new Audio(learnBgmSrc);
    learnBgm.loop = true;
    learnBgm.volume = 0.6;
  }
  playBgm(learnBgm);
}

/** 一時停止する（正解・不正解の演出中や画面を離れたとき。次の問題では続きから） */
export function pauseLearnBgm(): void {
  if (!learnBgm) return;
  pauseBgm(learnBgm);
}

/* ---------- 起動時など、ほかに音楽がない画面のBGM（フリーBGMをループ再生） ---------- */

let idleBgm: HTMLAudioElement | null = null;

/**
 * 音楽がない画面（起動画面・ホーム・図鑑など）のBGMをループ再生する（既に再生中なら何もしない）。
 * 設定で「演出の音」がオフのときは鳴らさない。
 */
export function startIdleBgm(): void {
  if (!getSettings().sound) return;
  if (!idleBgm) {
    idleBgm = new Audio(idleBgmSrc);
    idleBgm.loop = true;
    idleBgm.volume = 0.4;
  }
  playBgm(idleBgm);
}

/** 一時停止する（学習・パチンコなど自前の音楽がある画面へ移るとき。戻ったら続きから） */
export function pauseIdleBgm(): void {
  if (!idleBgm) return;
  pauseBgm(idleBgm);
}
