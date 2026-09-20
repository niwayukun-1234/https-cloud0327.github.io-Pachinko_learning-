/** Synthesized effects and optional device Japanese speech. No remote audio requests. */
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = false;
  volume = 0.55;
  voice = true;
  private ensure() {
    if (!this.context || this.context.state === "closed") {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
    }
    return this.context;
  }
  enable(on: boolean) {
    this.enabled = on;
    if (on) {
      const a = this.ensure();
      this.master!.gain.setValueAtTime(this.volume, a.currentTime);
      void a.resume().catch(() => {});
    } else {
      if (this.context && this.master)
        this.master.gain.setValueAtTime(0, this.context.currentTime);
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    }
  }
  setVolume(value: number) {
    this.volume = value;
    if (this.master && this.context)
      this.master.gain.setValueAtTime(
        this.enabled ? value : 0,
        this.context.currentTime,
      );
    if (value === 0 && "speechSynthesis" in window) speechSynthesis.cancel();
  }
  beep(
    frequency: number,
    duration = 0.12,
    delay = 0,
    type: OscillatorType = "sine",
    end?: number,
  ) {
    if (!this.enabled || document.hidden) return;
    const a = this.ensure(),
      at = a.currentTime + delay;
    const oscillator = a.createOscillator(),
      gain = a.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    if (end)
      oscillator.frequency.exponentialRampToValueAtTime(end, at + duration);
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.exponentialRampToValueAtTime(
      type === "sine" ? 0.14 : 0.055,
      at + 0.012,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    oscillator.connect(gain);
    gain.connect(this.master!);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  whoosh() {
    if (!this.enabled || document.hidden) return;
    const a = this.ensure(),
      length = Math.floor(a.sampleRate * 0.3);
    const buffer = a.createBuffer(1, length, a.sampleRate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = a.createBufferSource(),
      filter = a.createBiquadFilter(),
      gain = a.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(280, a.currentTime);
    filter.frequency.exponentialRampToValueAtTime(5000, a.currentTime + 0.26);
    gain.gain.value = 0.18;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    source.start();
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  stopSpeech() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }
  speak(text: string) {
    if (
      !this.enabled ||
      !this.voice ||
      !this.volume ||
      document.hidden ||
      !("speechSynthesis" in window)
    )
      return;
    speechSynthesis.cancel();
    const line = new SpeechSynthesisUtterance(text);
    line.lang = "ja-JP";
    line.rate = 1.2;
    line.pitch = 1.15;
    line.volume = this.volume;
    const japanese = speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith("ja"));
    if (japanese) line.voice = japanese;
    speechSynthesis.speak(line);
  }
  cue(name: string) {
    if (!this.enabled) return;
    if (name.startsWith("cut")) {
      const level = Number(name.slice(3));
      this.whoosh();
      this.beep(100 + level * 30, 0.3, 0, "triangle", 45);
      this.beep(550 + level * 180, 0.3, 0.07, "sawtooth", 1800);
      this.speak(["", "桜、舞え！", "覚醒！", "咲き誇れ！"][level]);
    } else if (name === "reach") {
      [440, 554, 659, 880].forEach((f, i) =>
        this.beep(f, 0.42, i * 0.15, "triangle"),
      );
      this.speak("激熱！");
    } else if (name === "push") {
      this.beep(110, 0.65, 0, "triangle", 330);
      [880, 1108, 1320].forEach((f, i) => this.beep(f, 0.3, 0.15 + i * 0.1));
      this.speak("押して！");
    } else if (name === "win") {
      this.whoosh();
      [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => {
        this.beep(f, 0.48, i * 0.16, "triangle");
        this.beep(f / 2, 0.5, i * 0.16);
      });
      this.speak("大当たり！ 桜、満開！");
    } else if (name === "miss") {
      [523, 659, 784].forEach((f, i) => this.beep(f, 0.25, i * 0.09));
      this.speak("次の一花へ！");
    }
  }
  dispose() {
    this.enable(false);
    if (this.context) void this.context.close().catch(() => {});
  }
}
