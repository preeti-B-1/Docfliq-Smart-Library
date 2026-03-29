import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ZeroResultSearch } from "@/types";

interface Props {
  searches: ZeroResultSearch[];
}

export default function ZeroResultsTable({ searches }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-gray-900">
          Searches with No Results
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {searches.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">
            No zero-result searches in this period.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Search Term</th>
                <th className="px-6 py-3 text-right">Times Searched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {searches.map((row, i) => (
                <tr key={row.query} className="hover:bg-gray-50">
                  <td className="px-6 py-2.5 text-gray-400">{i + 1}</td>
                  <td className="px-6 py-2.5 font-medium text-gray-800">{row.query}</td>
                  <td className="px-6 py-2.5 text-right text-red-500 font-medium">
                    {row.count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
