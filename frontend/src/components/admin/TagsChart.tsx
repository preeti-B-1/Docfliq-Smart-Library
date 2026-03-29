"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TagPopularity } from "@/types";

const COLORS = [
  "#2563EB", "#0D9488", "#16A34A", "#7C3AED", "#EA580C",
  "#0891B2", "#9333EA", "#65A30D", "#DC2626", "#0284C7",
  "#D97706", "#059669", "#4F46E5", "#DB2777", "#0F766E",
];

interface Props {
  specialties: TagPopularity[];
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: LabelProps) {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function TagsChart({ specialties }: Props) {
  const data = specialties.map((s) => ({ name: s.name, value: s.article_count }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-gray-900">
          Articles by Specialty
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No specialty data available.</p>
        ) : (
          <div className="flex gap-6 items-start">
            <ResponsiveContainer width="50%" height={280}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  dataKey="value"
                  labelLine={false}
                  label={renderLabel}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={{ fontSize: 13, borderRadius: 6, border: "1px solid #E2E8F0" }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex-1 grid grid-cols-1 gap-1 text-sm overflow-y-auto" style={{ maxHeight: 280 }}>
              {data.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between gap-2 py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate text-gray-700">{entry.name}</span>
                  </div>
                  <span className="text-gray-500 shrink-0">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
