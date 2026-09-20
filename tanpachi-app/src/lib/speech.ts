/**
 * Web Speech API で英単語を読み上げる。
 * 非対応環境では何もせず、直前の読み上げは必ずキャンセルする。
 */
export function speak(text: string, rate = 1) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
