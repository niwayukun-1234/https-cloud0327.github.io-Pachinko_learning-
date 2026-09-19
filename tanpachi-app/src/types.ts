export type Word = {
  id: string;
  word: string;
  phonetic: string;
  meaning: string;
  choices: string[]; // includes the correct meaning
  difficulty?: "normal" | "hard";
};

export type WordStatus = {
  learned: boolean;
  weak: boolean;
  starred: boolean;
};

export type BallHistoryEntry = {
  id: string;
  at: string; // ISO
  delta: number;
  reason: string;
};

export type RewardCategory = "item" | "bonus" | "custom";

export type Reward = {
  id: string;
  name: string;
  cost: number;
  category: RewardCategory;
  icon: "sakura" | "premium" | "title" | "theme" | "sound";
};

export type MenuItem = {
  label: string;
  badge?: number;
  trailing?: string;
  icon: string;
};
