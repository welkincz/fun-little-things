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

const compareTooltip = {
  contentStyle: {
    background: "#fff",
    border: "1px solid #E3E3DD",
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.35,
    color: "#1A1D1F",
    padding: "8px 10px",
    maxWidth: "min(260px, calc(100vw - 80px))",
  },
  itemStyle: { color: "#1A1D1F", padding: 0 },
  labelStyle: { color: "#5C6166", fontWeight: 500, marginBottom: 4 },
  wrapperStyle: { zIndex: 2, outline: "none" },
  allowEscapeViewBox: { x: false, y: true },
};

export function BalanceChart({
  points,
  compare = false,
}: {
  points: { year: number; balance: number; monthly?: number }[];
  compare?: boolean;
}) {
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
    <>
      <div
        className="chart"
        role={compare ? "img" : undefined}
        aria-label={compare ? "Remaining balance on your schedule and with monthly payments" : undefined}
      >
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
              {...(compare ? compareTooltip : {})}
            />
            <Area
              type="monotone"
              dataKey="balance"
              name={compare ? "Your schedule" : "Balance"}
              stroke="#135E4B"
              strokeWidth={2.25}
              fill="#135E4B"
              fillOpacity={0.16}
              isAnimationActive={!reduced}
              animationDuration={300}
            />
            {compare ? (
              <Area
                type="monotone"
                dataKey="monthly"
                name="Monthly"
                stroke="#5C6166"
                strokeWidth={2.25}
                strokeDasharray="4 3"
                fill="#5C6166"
                fillOpacity={0}
                isAnimationActive={!reduced}
                animationDuration={300}
                activeDot={{ r: 3, strokeWidth: 0, fill: "#5C6166" }}
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {compare ? (
        <ul className="chart-legend">
          <li>
            <i className="swatch swatch-principal" aria-hidden="true" />
            Your schedule
          </li>
          <li>
            <i className="swatch swatch-monthly" aria-hidden="true" />
            Monthly
          </li>
        </ul>
      ) : null}
    </>
  );
}
