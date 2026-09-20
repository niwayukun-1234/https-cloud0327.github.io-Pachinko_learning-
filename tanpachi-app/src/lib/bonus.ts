// 演出の途中（半分のタイミング）で出現する追加ボーナス玉数を抽選する。
//  - 通常: 50 / 100 / 150 をほぼ均等に
//  - 確変中: 多い玉数（150）が出やすい
//  - 10% ずつの確率で +500 / +1000 の大当たり
export function rollMidBonus(kakuhen: boolean): number {
  const r = Math.random();
  if (r < 0.1) return 500; // 10%
  if (r < 0.2) return 1000; // 10%

  const x = Math.random();
  if (kakuhen) {
    // 確変中は多い玉数が当たりやすい（50:100:150 = 15%:30%:55%）
    if (x < 0.15) return 50;
    if (x < 0.45) return 100;
    return 150;
  }
  // 通常時はほぼ均等
  if (x < 0.34) return 50;
  if (x < 0.67) return 100;
  return 150;
}

/** 大当たり（+500 / +1000）かどうか */
export function isBigBonus(n: number): boolean {
  return n >= 500;
}
