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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailySignup } from "@/types";

interface Props {
  signups: DailySignup[];
}

function formatAxisDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SignupsChart({ signups }: Props) {
  const data = signups.map((s) => ({
    date: s.date,
    label: formatAxisDate(s.date),
    count: s.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-gray-900">Daily Signups</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No signup data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                formatter={(value: number) => [value, "Signups"]}
                labelFormatter={(label: string) => {
                  const match = data.find((d) => d.label === label);
                  return match?.date ?? label;
                }}
                contentStyle={{ fontSize: 13, borderRadius: 6, border: "1px solid #E2E8F0" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#2563EB"
                strokeWidth={2}
                fill="url(#signupGradient)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
