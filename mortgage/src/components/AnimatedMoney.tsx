import { useEffect, useState } from "react";
import { useReducedMotion, useSpring } from "motion/react";
import { formatCAD } from "../format";

export function AnimatedMoney({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const spring = useSpring(value, { stiffness: 70, damping: 18, mass: 0.7 });
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    spring.set(value);
  }, [reduced, spring, value]);

  useEffect(() => {
    if (reduced) return;
    return spring.on("change", (next) => setShown(next));
  }, [reduced, spring]);

  return <>{formatCAD(reduced ? value : shown)}</>;
}
