"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  valueLabel?: string;
  height?: number;
  color?: string;
}

export function BarChart({
  data,
  valueLabel = "Value",
  height = 300,
  color = "var(--cr-accent)",
}: BarChartProps) {
  const longestTick = data.reduce((max, d) => Math.max(max, Number(d.value).toLocaleString().length), 0);
  const yAxisWidth = Math.max(40, Math.min(90, longestTick * 7 + 12));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(90, 106, 81, 0.12)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--cr-primary, var(--cr-dark))", fontSize: 12, opacity: 0.7 }}
            axisLine={{ stroke: "rgba(90, 106, 81, 0.15)" }}
            tickLine={false}
          />
          <YAxis
            width={yAxisWidth}
            tick={{ fill: "var(--cr-primary, var(--cr-dark))", fontSize: 12, opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => Number(v).toLocaleString()}
          />
          <Tooltip
            cursor={{ fill: "rgba(90, 106, 81, 0.05)" }}
            contentStyle={{
              backgroundColor: "var(--cr-white)",
              border: "1px solid rgba(90, 106, 81, 0.15)",
              borderRadius: "12px",
              color: "var(--cr-primary, var(--cr-dark))",
            }}
            formatter={(value: any) => [Number(value ?? 0).toLocaleString(), valueLabel]}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
