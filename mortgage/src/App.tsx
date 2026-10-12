import { useEffect, useMemo, useState } from "react";
import { MotionConfig } from "motion/react";
import { minDownPayment } from "./lib/mortgage/down";
import { calculate, type CalculatorInput } from "./lib/mortgage/scenario";
import { parseSearch, serialize } from "./lib/mortgage/url";
import { formatCAD } from "./format";
import { Notes } from "./components/Notes";
import { Statement } from "./components/Statement";

const INVALID_LINK = "Some details in the link could not be read, so those fields use the example.";

export function App() {
  const initial = useMemo(() => parseSearch(window.location.search), []);
  const [input, setInput] = useState<CalculatorInput>(initial.input);
  const [toast, setToast] = useState<string | null>(initial.invalid ? INVALID_LINK : null);
  const [copied, setCopied] = useState(false);
  const [downFollowsMin, setDownFollowsMin] = useState(
    () => Math.abs(initial.input.downPayment - minDownPayment(initial.input.price)) < 0.02,
  );
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

  function onChange(patch: Partial<CalculatorInput>) {
    setInput((prev) => ({ ...prev, ...patch }));
  }

  function onPrice(price: number) {
    setInput((prev) => ({
      ...prev,
      price,
      downPayment: downFollowsMin ? minDownPayment(price) : prev.downPayment,
    }));
  }

  function onDown(down: number) {
    setDownFollowsMin(false);
    setInput((prev) => ({ ...prev, downPayment: down }));
  }

  function onUseMinimum() {
    setDownFollowsMin(true);
    setInput((prev) => ({ ...prev, downPayment: minDownPayment(prev.price) }));
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

  const dockLabel =
    result.blocked === "not-insurable" ? "Not insurable" : result.blocked ? "Minimum down" : result.frequencyLabel;
  const dockValue = result.blocked ? formatCAD(result.minimumDown) : formatCAD(result.payment ?? 0);

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
      <div className="sheet">
        <Notes
          input={input}
          result={result}
          onChange={onChange}
          onPrice={onPrice}
          onDown={onDown}
          onUseMinimum={onUseMinimum}
        />
        <Statement input={input} result={result} copied={copied} onCopy={onCopy} />
      </div>
      <div className="dock">
        <div>
          <p className="dock-label">{dockLabel}</p>
          <p className="dock-pay">{dockValue}</p>
        </div>
        <button type="button" onClick={onCopy}>
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </MotionConfig>
  );
}
