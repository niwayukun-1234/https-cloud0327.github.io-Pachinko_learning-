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
  void audio.play().catch(() => {
    /* 自動再生がブロックされた環境では無視 */
  });
  return audio;
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
