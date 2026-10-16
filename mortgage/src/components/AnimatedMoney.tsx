import { useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { formatCAD, formatDollars } from "../format";

export function AnimatedMoney({
  value,
  whole = false,
  jumpRef,
}: {
  value: number;
  whole?: boolean;
  jumpRef: { current: boolean };
}) {
  const reduced = useReducedMotion();
  const shownRef = useRef(value);
  const ready = useRef(false);
  const [shown, setShown] = useState(value);

  useLayoutEffect(() => {
    if (!ready.current) {
      ready.current = true;
      shownRef.current = value;
      setShown(value);
      jumpRef.current = false;
      return;
    }
    if (reduced || jumpRef.current) {
      jumpRef.current = false;
      shownRef.current = value;
      setShown(value);
      return;
    }
    const from = shownRef.current;
    const to = value;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 400);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (to - from) * eased;
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [jumpRef, reduced, value]);

  return <>{whole ? formatDollars(shown) : formatCAD(shown)}</>;
}
