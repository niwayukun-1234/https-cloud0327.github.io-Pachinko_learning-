// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { AppProvider, initialState, useApp } from "../src/store/AppContext";
import { useHanamaiSpin } from "../src/pages/PachinkoMode/hanamai/useHanamaiSpin";
import * as lottery from "../src/pages/PachinkoMode/hanamai/lottery";

function useIntegrated() {
  const app = useApp();
  const spin = useHanamaiSpin({
    balls: app.state.balls,
    streak: app.state.streak,
    onCommit: app.spinQuiz,
  });
  return { ...spin, app };
}
const mount = () => renderHook(useIntegrated, { wrapper: AppProvider });
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
type Game = ReturnType<typeof mount>;
function answerRound(game: Game, correct: boolean) {
  act(() => game.result.current.start());
  advance(2200);
  expect(game.result.current.phase).toBe("quiz");
  const q = game.result.current.question!;
  const index = correct
    ? q.correctIndex
    : (q.correctIndex + 1) % q.choices.length;
  act(() => game.result.current.answer(index));
}
function complete(game: Game) {
  advance(1200);
  if (game.result.current.phase === "reach") {
    advance(1600);
    act(() => game.result.current.finish());
  }
  advance(5000);
  expect(game.result.current.phase).toBe("idle");
}
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("independent Hanamai lottery", () => {
  it("uses the normal and RUSH boundaries, including the final RUSH round", () => {
    expect(lottery.drawRound(0, 0.19999)).toEqual({
      win: true,
      reward: 1000,
      nextRush: 5,
    });
    expect(lottery.drawRound(0, 0.2)).toEqual({
      win: false,
      reward: 0,
      nextRush: 0,
    });
    expect(lottery.drawRound(1, 0.49999)).toEqual({
      win: true,
      reward: 1500,
      nextRush: 5,
    });
    expect(lottery.drawRound(1, 0.5)).toEqual({
      win: false,
      reward: 0,
      nextRush: 0,
    });
  });
  it("pays a lottery win even for a wrong answer and commits only once", () => {
    vi.spyOn(lottery, "random").mockReturnValue(0.1);
    const game = mount();
    act(() => {
      game.result.current.start();
      game.result.current.start();
    });
    advance(2200);
    const q = game.result.current.question!;
    const wrong = (q.correctIndex + 1) % q.choices.length;
    act(() => {
      game.result.current.answer(wrong);
      game.result.current.answer(wrong);
    });
    expect(game.result.current.app.state.balls).toBe(
      initialState.balls - 10 + 1000,
    );
    expect(game.result.current.app.state.totalSpins).toBe(
      initialState.totalSpins + 1,
    );
    expect(game.result.current.app.state.answered).toBe(
      initialState.answered + 1,
    );
    expect(game.result.current.app.state.correct).toBe(initialState.correct);
    expect(game.result.current.app.state.streak).toBe(0);
    expect(game.result.current.app.state.history[0].reason).toContain(
      "大当たり / 学習不正解",
    );
    expect(game.result.current.judgement?.reward).toBe(0);
    advance(2800);
    act(() => {
      game.result.current.finish();
      game.result.current.finish();
    });
    expect(game.result.current.phase).toBe("win");
    expect(game.result.current.reward).toBe(1000);
    expect(game.result.current.answers).toHaveLength(1);
    expect(game.result.current.app.state.balls).toBe(initialState.balls + 990);
  });
  it("charges a losing spin while recording a correct quiz answer", () => {
    vi.spyOn(lottery, "random").mockReturnValue(0.9);
    const game = mount();
    answerRound(game, true);
    expect(game.result.current.app.state.balls).toBe(initialState.balls - 10);
    expect(game.result.current.app.state.correct).toBe(
      initialState.correct + 1,
    );
    expect(game.result.current.app.state.streak).toBe(1);
    expect(game.result.current.app.state.history[0].reason).toContain(
      "ハズレ / 学習正解",
    );
    advance(1200);
    expect(game.result.current.phase).toBe("miss");
  });
  it("expires RUSH after five losses and awards 1500 on its last eligible spin", () => {
    const rng = vi.spyOn(lottery, "random").mockReturnValue(0.1);
    const game = mount();
    answerRound(game, true);
    complete(game);
    expect(game.result.current.rush).toBe(5);
    rng.mockReturnValue(0.9);
    for (let i = 4; i >= 1; i--) {
      answerRound(game, false);
      complete(game);
      expect(game.result.current.rush).toBe(i);
    }
    rng.mockReturnValue(0.49);
    answerRound(game, false);
    complete(game);
    expect(game.result.current.reward).toBe(1500);
    expect(game.result.current.rush).toBe(5);
    rng.mockReturnValue(0.9);
    for (let i = 4; i >= 0; i--) {
      answerRound(game, true);
      complete(game);
      expect(game.result.current.rush).toBe(i);
    }
    rng.mockReturnValue(0.49);
    answerRound(game, true);
    advance(1200);
    expect(game.result.current.phase).toBe("miss");
    expect(game.result.current.reward).toBe(0);
  });
  it("automatically reveals PUSH and keeps demo out of shared state and quiz progress", () => {
    const game = mount();
    const before = game.result.current.app.state;
    act(() => game.result.current.start(true));
    advance(2200);
    advance(1600);
    expect(game.result.current.phase).toBe("push");
    advance(5000);
    expect(game.result.current.phase).toBe("win");
    expect(game.result.current.app.state).toBe(before);
    expect(game.result.current.drawn).toBe(0);
    expect(game.result.current.rush).toBe(0);
  });
  it("blocks insufficient funds", () => {
    localStorage.setItem(
      "tanpachi:v1",
      JSON.stringify({ ...initialState, balls: 9 }),
    );
    const game = mount();
    act(() => game.result.current.start());
    advance(3000);
    expect(game.result.current.phase).toBe("idle");
    expect(game.result.current.app.state.totalSpins).toBe(
      initialState.totalSpins,
    );
  });
  it("ignores out-of-range and fractional answer indices", () => {
    const game = mount();
    act(() => game.result.current.start());
    advance(2200);
    act(() => { game.result.current.answer(-1); game.result.current.answer(99); game.result.current.answer(0.5); });
    expect(game.result.current.phase).toBe("quiz");
    expect(game.result.current.app.state.balls).toBe(initialState.balls);
    expect(game.result.current.answers).toHaveLength(0);
  });
  it("cleans all animation timers on unmount and preserves a committed answer", () => {
    vi.spyOn(lottery, "random").mockReturnValue(0.1);
    const game = mount();
    answerRound(game, true);
    game.unmount();
    expect(vi.getTimerCount()).toBe(0);
    const saved = JSON.parse(localStorage.getItem("tanpachi:v1")!);
    expect(saved.balls).toBe(initialState.balls + 990);
    expect(saved.answered).toBe(initialState.answered + 1);
  });
  it("does not change the legacy quiz-spin reward or history path", () => {
    const game = mount();
    act(() =>
      game.result.current.app.spinQuiz({
        quizId: "legacy",
        word: "test",
        correct: true,
        reward: 15,
        penalty: 0,
        cost: 10,
        streak: 1,
        jackpot: false,
      }),
    );
    expect(game.result.current.app.state.balls).toBe(initialState.balls + 5);
    expect(game.result.current.app.state.history[0].reason).toBe(
      "パチンコ 正解 (test)",
    );
  });
});
