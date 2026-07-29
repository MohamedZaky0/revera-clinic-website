"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface LineAreaChartProps {
  data: Array<{ label: string; value: number }>;
  valueLabel?: string;
  height?: number;
  color?: string;
}

export function LineAreaChart({
  data,
  valueLabel = "Value",
  height = 300,
  color = "var(--cr-primary)",
}: LineAreaChartProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id="lineAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tick={{ fill: "var(--cr-primary, var(--cr-dark))", fontSize: 12, opacity: 0.7 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => Number(v).toLocaleString()}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--cr-white)",
              border: "1px solid rgba(90, 106, 81, 0.15)",
              borderRadius: "12px",
              color: "var(--cr-primary, var(--cr-dark))",
            }}
            formatter={(value: any) => [Number(value ?? 0).toLocaleString(), valueLabel]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#lineAreaFill)"
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
