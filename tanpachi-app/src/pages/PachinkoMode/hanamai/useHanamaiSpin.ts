import { useCallback, useEffect, useRef, useState } from "react";
import type { QuizQuestion } from "../../../data/toeicQuiz";
import { useQuizModal } from "../../../hooks/useQuizModal";
import type {
  QuizJudgement,
  SpinSessionAnswer,
} from "../../../hooks/usePachinkoSpin";
import type { QuizSpinResult } from "../../../types";
import { drawRound, HANAMAI_RULES, random } from "./lottery";

export type HanamaiPhase =
  "idle" | "spin" | "quiz" | "judging" | "reach" | "push" | "win" | "miss";

type Options = {
  balls: number;
  streak: number;
  onCommit: (result: QuizSpinResult) => void;
};

/** One question per spin; correctness affects learning, randomness affects payout. */
export function useHanamaiSpin({ balls, streak, onCommit }: Options) {
  const pool = useQuizModal();
  const { drawNext } = pool;
  const [phase, setPhase] = useState<HanamaiPhase>("idle");
  const phaseRef = useRef<HanamaiPhase>("idle");
  const [rush, setRush] = useState(0);
  const [demo, setDemo] = useState(false);
  const [cut, setCut] = useState(0);
  const [reels, setReels] = useState([7, 7, 7]);
  const [reward, setReward] = useState(0);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [judgement, setJudgement] = useState<QuizJudgement | null>(null);
  const [answers, setAnswers] = useState<SpinSessionAnswer[]>([]);
  const [startedAt] = useState(Date.now);
  const questionAt = useRef(0);
  const round = useRef(drawRound(0, 1));
  const demoRef = useRef(false);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const transition = useCallback((next: HanamaiPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const reveal = useCallback(() => {
    transition(round.current.win ? "win" : "miss");
    setReels(round.current.win ? [7, 7, 7] : [7, 3, 7]);
    setReward(round.current.reward);
    later(
      () => {
        setDemo(false);
        setQuestion(null);
        setJudgement(null);
        transition("idle");
      },
      round.current.win ? 4200 : 1700,
    );
  }, [later, transition]);

  const finish = useCallback(() => {
    if (phaseRef.current !== "push") return;
    reveal();
  }, [reveal]);

  const showOutcome = useCallback(() => {
    if (round.current.win || random() < 0.3) {
      transition("reach");
      setReels([7, 4, 7]);
      later(() => {
        transition("push");
        later(() => {
          if (phaseRef.current === "push") reveal();
        }, 5000);
      }, 1600);
    } else {
      reveal();
    }
  }, [later, reveal, transition]);

  const start = useCallback(
    (showcase = false) => {
      if (
        phaseRef.current !== "idle" ||
        (!showcase && balls < HANAMAI_RULES.cost)
      )
        return;
      demoRef.current = showcase;
      setDemo(showcase);
      round.current = drawRound(rush, showcase ? 0 : random());
      setJudgement(null);
      setReward(0);
      transition("spin");
      setCut(1);
      later(() => setCut(2), 650);
      later(() => setCut(3), 1350);
      later(() => setCut(0), 2050);
      later(() => {
        if (showcase) {
          showOutcome();
          return;
        }
        setQuestion(drawNext());
        questionAt.current = performance.now();
        transition("quiz");
      }, 2200);
    },
    [balls, rush, drawNext, later, showOutcome, transition],
  );

  const answer = useCallback(
    (choiceIndex: number) => {
      if (
        phaseRef.current !== "quiz" ||
        !question ||
        demoRef.current ||
        !Number.isInteger(choiceIndex) ||
        choiceIndex < 0 ||
        choiceIndex >= question.choices.length
      )
        return;
      // Lock synchronously before committing; double taps cannot charge/reward twice.
      transition("judging");
      const correct = choiceIndex === question.correctIndex;
      const nextStreak = correct ? streak + 1 : 0;
      setJudgement({
        selectedIndex: choiceIndex,
        correct,
        reward: 0,
        penalty: 0,
        streak: nextStreak,
        jackpot: false,
      });
      setAnswers((prev) => [
        ...prev,
        {
          quizId: `toeic-${question.id}`,
          word: question.word,
          correct,
          seconds: Math.max(
            0.1,
            Math.round((performance.now() - questionAt.current) / 100) / 10,
          ),
        },
      ]);
      // One atomic AppContext action updates shared balls, history and learning records.
      // Commit on answer, before the animation, so leaving during the effect loses no payout.
      onCommit({
        mode: "hanamai",
        quizId: `toeic-${question.id}`,
        word: question.word,
        correct,
        reward: round.current.reward,
        penalty: 0,
        cost: HANAMAI_RULES.cost,
        streak: nextStreak,
        jackpot: round.current.win,
      });
      setRush(round.current.nextRush);
      later(showOutcome, 1200);
    },
    [question, streak, onCommit, later, showOutcome, transition],
  );

  useEffect(() => {
    if (phase !== "spin" && phase !== "reach") return;
    const id = setInterval(
      () =>
        setReels((prev) =>
          phase === "reach"
            ? [7, (prev[1] % 9) + 1, 7]
            : prev.map(() => 1 + Math.floor(random() * 9)),
        ),
      phase === "reach" ? 120 : 85,
    );
    return () => clearInterval(id);
  }, [phase]);

  return {
    phase,
    rush,
    demo,
    cut,
    reels,
    reward,
    question,
    judgement,
    answers,
    startedAt,
    start,
    finish,
    answer,
    drawn: pool.drawn,
    remaining: pool.remaining,
    total: pool.total,
    canSpin: phase === "idle" && balls >= HANAMAI_RULES.cost,
    busy: phase !== "idle",
  };
}
