import { useEffect, useRef } from "react";
import { random } from "./lottery";
export function Board({
  active,
  power,
  reduced,
}: {
  active: boolean;
  power: number;
  reduced: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activity = useRef({ active, power });
  useEffect(() => {
    activity.current = { active, power };
  }, [active, power]);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let frame = 0,
      last = 0,
      spawn = 0;
    const balls: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      age: number;
    }[] = [];
    const pins = Array.from({ length: 17 }, (_, r) =>
      Array.from({ length: 17 }, (_, i) => ({
        x: 38 + i * 32 + (r % 2) * 16,
        y: 95 + r * 32,
      })),
    )
      .flat()
      .filter(
        (p) =>
          !(p.x > 90 && p.x < 510 && p.y < 425) &&
          !(p.x > 218 && p.x < 382 && p.y > 440),
      );
    function draw(t: number) {
      const dt = Math.min((t - last) / 16.67, 2);
      last = t;
      ctx.clearRect(0, 0, 600, 700);
      ctx.strokeStyle = "#be8a4938";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(300, 337, 276, 317, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(300, 337, 264, 305, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (const p of pins) {
        ctx.beginPath();
        ctx.fillStyle = "#e7c78b";
        ctx.shadowColor = "#f9ca66";
        ctx.shadowBlur = 5;
        ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (
        activity.current.active &&
        t - spawn > 160 - activity.current.power * 15
      ) {
        spawn = t;
        balls.push({
          x: 545,
          y: 605,
          vx: -3.8 - activity.current.power * 0.3,
          vy: -17 - random() * 2,
          age: 0,
        });
      }
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        b.age += dt;
        b.vy += 0.23 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < 36 || b.x > 562) {
          b.vx *= -0.8;
          b.x = Math.max(36, Math.min(562, b.x));
        }
        if (b.y < 30) {
          b.y = 30;
          b.vy = Math.abs(b.vy) * 0.65;
        }
        for (const p of pins) {
          const dx = b.x - p.x,
            dy = b.y - p.y,
            d = Math.hypot(dx, dy);
          if (d < 7 && d > 0) {
            b.x = p.x + (dx / d) * 7;
            b.y = p.y + (dy / d) * 7;
            b.vx += (dx / d) * 1.5;
            b.vy = (dy / d) * Math.max(1, Math.abs(b.vy) * 0.55);
          }
        }
        if (b.y > 675 || b.age > 600) {
          balls.splice(i, 1);
          continue;
        }
        const g = ctx.createRadialGradient(b.x - 1, b.y - 2, 0, b.x, b.y, 5);
        g.addColorStop(0, "#fff");
        g.addColorStop(0.35, "#eef0f6");
        g.addColorStop(1, "#535669");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);
  return (
    <canvas
      ref={ref}
      width={600}
      height={700}
      className="ball-board"
      aria-label="玉が釘を弾きながら流れるパチンコ盤"
    />
  );
}
