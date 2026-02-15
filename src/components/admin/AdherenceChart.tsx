"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface DailyData {
  date: string;
  selfReported: number;
  capOpened: number;
}

interface AdherenceChartProps {
  dailyData: DailyData[];
  chartType: "bar" | "line";
}

export default function AdherenceChart({
  dailyData,
  chartType,
}: AdherenceChartProps) {
  const Chart = chartType === "bar" ? BarChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <Chart data={dailyData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit="%" />
        <Tooltip />
        <Legend />
        {chartType === "bar" ? (
          <>
            <Bar
              dataKey="selfReported"
              name="Self-Reported"
              fill="#818cf8"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="capOpened"
              name="Cap Opened"
              fill="#34d399"
              radius={[4, 4, 0, 0]}
            />
          </>
        ) : (
          <>
            <Line
              type="monotone"
              dataKey="selfReported"
              name="Self-Reported"
              stroke="#818cf8"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="capOpened"
              name="Cap Opened"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </>
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
