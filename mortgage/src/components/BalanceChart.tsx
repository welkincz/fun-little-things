import { useEffect } from "react";
import { useReducedMotion } from "motion/react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCAD, formatCompact } from "../format";

type MeasurementSpan = {
  textContent: string | null;
  style: { visibility: string };
};

/** Recharts parks the last measured tick in #recharts_measurement_span. That text is "$0". */
export function clearMeasurementSpan(doc: { getElementById(id: string): MeasurementSpan | null }): void {
  const span = doc.getElementById("recharts_measurement_span");
  if (!span) return;
  if (span.textContent) span.textContent = "";
  if (span.style.visibility !== "hidden") span.style.visibility = "hidden";
}

export function BalanceChart({ points }: { points: { year: number; balance: number }[] }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    let observer: MutationObserver | undefined;
    let timer = 0;
    let attempts = 0;
    const attach = () => {
      clearMeasurementSpan(document);
      const span = document.getElementById("recharts_measurement_span");
      if (span && !observer) {
        observer = new MutationObserver(() => clearMeasurementSpan(document));
        observer.observe(span, { characterData: true, childList: true, subtree: true });
        return;
      }
      attempts += 1;
      if (!observer && attempts < 20) timer = window.setTimeout(attach, 50);
    };
    // ResponsiveContainer measures after paint, so the span shows up a moment later.
    attach();
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [points]);
  if (points.length === 0) return null;
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="year"
            tick={{ fill: "#5C6166", fontSize: 13 }}
            axisLine={{ stroke: "#E3E3DD" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompact(value)}
            width={76}
            tick={{ fill: "#5C6166", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => formatCAD(Number(value))}
            labelFormatter={(year) => `Year ${year}`}
          />
          <Area
            type="monotone"
            dataKey="balance"
            name="Balance"
            stroke="#135E4B"
            strokeWidth={2.25}
            fill="#135E4B"
            fillOpacity={0.16}
            isAnimationActive={!reduced}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
