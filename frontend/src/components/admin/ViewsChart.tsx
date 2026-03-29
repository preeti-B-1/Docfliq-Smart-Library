"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TopArticleView } from "@/types";

interface Props {
  articles: TopArticleView[];
}

export default function ViewsChart({ articles }: Props) {
  const data = articles.map((a, i) => ({
    rank: `#${i + 1}`,
    views: a.view_count,
    fullTitle: a.title,
    id: a.id,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-gray-900">
          Most Viewed Articles
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No view data for this period.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="rank"
                  width={32}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [value, "Views"]}
                  labelFormatter={(label: string) => {
                    const match = data.find((d) => d.rank === label);
                    return match?.fullTitle ?? label;
                  }}
                  contentStyle={{ fontSize: 13, borderRadius: 6, border: "1px solid #E2E8F0" }}
                />
                <Bar dataKey="views" fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>

            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  <th className="pb-2 pr-3 w-8">#</th>
                  <th className="pb-2 pr-3">Article</th>
                  <th className="pb-2 text-right">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((row, i) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="py-1.5 pr-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-1.5 pr-3">
                      <a href={`/article/${row.id}`} className="text-blue-600 hover:underline line-clamp-1">
                        {row.fullTitle}
                      </a>
                    </td>
                    <td className="py-1.5 text-right font-medium text-gray-700">{row.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
