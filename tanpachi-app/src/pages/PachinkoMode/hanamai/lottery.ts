/** The learning answer never participates in the lottery. */
export const HANAMAI_RULES = {
  cost: 10,
  normalProbability: 1 / 5,
  rushProbability: 1 / 2,
  normalReward: 1000,
  rushReward: 1500,
  rushRounds: 5,
} as const;

export const random = () =>
  crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;

export function drawRound(rushRemaining: number, sample: number) {
  const inRush = rushRemaining > 0;
  const win =
    sample <
    (inRush ? HANAMAI_RULES.rushProbability : HANAMAI_RULES.normalProbability);
  return {
    win,
    reward: win
      ? inRush
        ? HANAMAI_RULES.rushReward
        : HANAMAI_RULES.normalReward
      : 0,
    nextRush: win ? HANAMAI_RULES.rushRounds : Math.max(0, rushRemaining - 1),
  };
}
