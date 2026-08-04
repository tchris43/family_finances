"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "#0f766e",
  "#b45309",
  "#1d4ed8",
  "#be123c",
  "#7c3aed",
  "#047857",
  "#a16207",
  "#334155",
];

export function CategoryTrendChart({
  rows,
  seriesKeys,
}: {
  rows: Record<string, string | number>[];
  seriesKeys: string[];
}) {
  if (rows.length === 0 || seriesKeys.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Add expenses across a few months to see category trends.
      </p>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows}
          margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
        >
          <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fill: "#78716c", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#d6d3d1" }}
          />
          <YAxis
            tick={{ fill: "#78716c", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v}`}
            width={48}
          />
          <Tooltip
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(Number.isFinite(n) ? n : 0);
            }}
            labelFormatter={(label) => `Month ${label}`}
            contentStyle={{
              background: "#fafaf9",
              border: "1px solid #d6d3d1",
              borderRadius: 8,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {seriesKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
