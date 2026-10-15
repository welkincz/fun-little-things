import { useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { minDownPayment } from "./lib/mortgage/down";
import { roundCents } from "./lib/mortgage/money";
import { calculate, type CalculatorInput } from "./lib/mortgage/scenario";
import { parseSearch, serialize } from "./lib/mortgage/url";
import { formatDollars } from "./format";
import { Notes } from "./components/Notes";
import { frequencyAffix, ResultHero, ScenarioDetails } from "./components/Statement";

const INVALID_LINK = "Some details in the link could not be read, so those fields use the example.";

type DownMode = "min" | "dollars" | "percent";

export function App() {
  const initial = useMemo(() => parseSearch(window.location.search), []);
  const [input, setInput] = useState<CalculatorInput>(initial.input);
  const [toast, setToast] = useState<string | null>(initial.invalid ? INVALID_LINK : null);
  const [copied, setCopied] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dockOn, setDockOn] = useState(false);
  const [downMode, setDownMode] = useState<DownMode>(() =>
    Math.abs(initial.input.downPayment - minDownPayment(initial.input.price)) < 0.02 ? "min" : "dollars",
  );
  const jumpRef = useRef(false);
  const result = useMemo(() => calculate(input), [input]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const query = serialize(input);
      const next = `${window.location.pathname}${query}${window.location.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (current !== next) window.history.replaceState(null, "", next);
    }, 300);
    return () => window.clearTimeout(id);
  }, [input]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    const hero = document.getElementById("results");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => {
      setDockOn(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  function onChange(patch: Partial<CalculatorInput>) {
    setInput((prev) => ({ ...prev, ...patch }));
  }

  function onPrice(price: number) {
    setInput((prev) => {
      let down = prev.downPayment;
      if (downMode === "min") down = minDownPayment(price);
      else if (downMode === "percent" && prev.price > 0) down = roundCents((price * prev.downPayment) / prev.price);
      else down = Math.min(prev.downPayment, price);
      return { ...prev, price, downPayment: Math.max(0, down) };
    });
  }

  function onDownAmount(amount: number) {
    setDownMode("dollars");
    setInput((prev) => ({ ...prev, downPayment: roundCents(Math.min(Math.max(0, amount), prev.price)) }));
  }

  function onDownPercent(percent: number) {
    setDownMode("percent");
    setInput((prev) => ({
      ...prev,
      downPayment: roundCents((prev.price * Math.min(100, Math.max(0, percent))) / 100),
    }));
  }

  async function onCopy() {
    const query = serialize(input);
    const path = `${window.location.pathname}${query}${window.location.hash}`;
    window.history.replaceState(null, "", path);
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setToast("The link is in the address bar. Copy it from there.");
    }
  }

  const affix = frequencyAffix(input.frequency);
  const dockText =
    result.blocked === "not-insurable"
      ? "Not insurable at $1.5M+. Need 20% down."
      : result.blocked === "down-min"
        ? `Minimum down is ${formatDollars(result.minimumDown)}.`
        : result.payment == null
          ? "—"
          : `${formatDollars(result.payment)}${affix.dock}`;

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip" href="#results">
        Skip to results
      </a>
      {toast ? (
        <div className="toast" role="status">
          <p>{toast}</p>
          <button type="button" onClick={() => setToast(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
      <div className="page">
        <h1>Mortgage calculator</h1>
        <div className="layout">
          <ResultHero input={input} result={result} jumpRef={jumpRef} onFrequency={(frequency) => onChange({ frequency })} />
          <Notes
            input={input}
            result={result}
            jumpRef={jumpRef}
            onPrice={onPrice}
            onDownAmount={onDownAmount}
            onDownPercent={onDownPercent}
            onChange={onChange}
          />
        </div>
        <button
          type="button"
          className="text-link"
          data-testid="see-details"
          aria-expanded={detailsOpen}
          aria-controls="scenario-details"
          onClick={() => setDetailsOpen((open) => !open)}
        >
          See details {detailsOpen ? "▴" : "▾"}
        </button>
        {detailsOpen ? (
          <ScenarioDetails input={input} result={result} copied={copied} onChange={onChange} onCopy={onCopy} />
        ) : null}
      </div>
      <div className={dockOn ? "dock on" : "dock"}>
        <p className={result.payment == null ? "dock-note" : "dock-pay"}>{dockText}</p>
      </div>
    </MotionConfig>
  );
}
