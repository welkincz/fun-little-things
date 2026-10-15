import { useReducedMotion } from "motion/react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCAD, formatCompact } from "../format";

export function BalanceChart({ points }: { points: { year: number; balance: number }[] }) {
  const reduced = useReducedMotion();
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
