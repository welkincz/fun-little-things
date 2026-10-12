import { motion, useReducedMotion } from "motion/react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCAD, formatCompact } from "../format";

export function BalanceChart({ points }: { points: { year: number; balance: number }[] }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="chart"
      aria-hidden="true"
      initial={reduced ? false : { clipPath: "inset(0 100% 0 0)" }}
      animate={{ clipPath: "inset(0 0% 0 0)" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="year"
            tick={{ fill: "#1c4f3a", fontSize: 13 }}
            axisLine={{ stroke: "#d5e0da" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompact(value)}
            width={76}
            tick={{ fill: "#1c4f3a", fontSize: 13 }}
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
            stroke="#204a86"
            strokeWidth={2.25}
            fill="#204a86"
            fillOpacity={0.14}
            isAnimationActive={!reduced}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
