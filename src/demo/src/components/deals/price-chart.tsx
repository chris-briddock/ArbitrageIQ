"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { PricePoint } from "@/lib/schemas";

const RANGES = [30, 90, 365] as const;
type Range = (typeof RANGES)[number];

const chartConfig = {
  buy: { label: "Buy price", color: "var(--chart-1)" },
  sell: { label: "Sell price", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function PriceChart({
  history,
  belowAveragePct,
}: {
  history: PricePoint[];
  belowAveragePct: string | null;
}) {
  const [range, setRange] = useState<Range>(90);

  const data = useMemo(
    () =>
      history.slice(-range).map((point) => ({
        date: point.date,
        buy: Number(point.buy_price_gbp),
        sell: Number(point.sell_price_gbp),
      })),
    [history, range],
  );

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Price History</h2>
          <p className="text-xs text-muted-foreground">
            Buy price trend (source) vs sell price trend
          </p>
        </div>
        <div className="flex gap-1 rounded-md border p-0.5">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                range === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>
      <ChartContainer config={chartConfig} className="h-56 w-full">
        <AreaChart data={data} margin={{ left: 4, right: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={48}
            tickFormatter={(value: string) =>
              new Date(value).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(value: number) => `£${value.toFixed(0)}`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            dataKey="sell"
            type="monotone"
            fill="var(--color-sell)"
            fillOpacity={0.08}
            stroke="var(--color-sell)"
            strokeWidth={2}
          />
          <Area
            dataKey="buy"
            type="monotone"
            fill="var(--color-buy)"
            fillOpacity={0.12}
            stroke="var(--color-buy)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
      {belowAveragePct ? (
        <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          ▼ Current buy price is {belowAveragePct}% BELOW the 90-day average
        </p>
      ) : null}
    </div>
  );
}
