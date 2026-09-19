import { useEffect, useRef, useState } from "react";

/**
 * 数値をイージング付きでカウントアップする。
 * リザルト画面のスコア・正答率・所持玉で使用し、
 * 演出が主役にならないよう短時間（既定 650ms）で完了させる。
 */
export function useCountUp(target: number, duration = 650, from = 0) {
  const [value, setValue] = useState(from);
  const begin = useRef(from);

  useEffect(() => {
    const start = begin.current;
    const t0 = performance.now();
    let raf = 0;

    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        begin.current = target;
        setValue(target);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
