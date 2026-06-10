"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { StatCard } from "@/components/deals/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api-client";
import { gbp, gbpWhole, pct, shortDate } from "@/lib/format";
import type { AnalyticsDashboard, SellChannel } from "@/lib/schemas";
import { useEntitlements } from "@/lib/use-entitlements";

const ALL = "all";
const PERIODS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 365 days" },
];
const RETAILERS = ["Tesco", "Walmart", "Amazon", "AliExpress"];
const CHANNELS: { value: SellChannel; label: string }[] = [
  { value: "amazon_fba", label: "Amazon FBA" },
  { value: "ebay", label: "eBay" },
  { value: "shopify", label: "Shopify" },
];

const STATUS_STYLES = {
  sold: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  listed: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
} as const;

const chartConfig = {
  revenue: { label: "Gross Revenue", color: "var(--chart-1)" },
  profit: { label: "Net Profit", color: "var(--chart-2)" },
} satisfies ChartConfig;

function PerformancePanel({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; profit: string; deals: number; margin: string }[];
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-center text-sm font-semibold">{title}</h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        {rows.map((row) => (
          <li
            key={row.name}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 tabular-nums"
          >
            <span className="font-medium">{row.name}:</span>
            <span>{gbpWhole(row.profit)} profit</span>
            <span className="text-muted-foreground">{row.deals} deals</span>
            <span className="text-muted-foreground">
              {pct(row.margin)} avg margin
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalyticsDashboardView() {
  const { entitlements } = useEntitlements();
  const canExport = entitlements?.csv_export ?? true;
  const [period, setPeriod] = useState("30");
  const [retailer, setRetailer] = useState(ALL);
  const [channel, setChannel] = useState(ALL);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (retailer !== ALL) {
      params.set("retailer", retailer);
    }
    if (channel !== ALL) {
      params.set("channel", channel);
    }

    return params.toString();
  }, [period, retailer, channel]);

  const { data, isPending } = useQuery({
    queryKey: ["analytics", queryString],
    queryFn: () =>
      apiFetch<AnalyticsDashboard>(`/api/v1/analytics?${queryString}`),
  });

  const chartData = useMemo(
    () =>
      (data?.daily ?? []).map((day) => ({
        date: day.date,
        revenue: Number(day.gross_revenue_gbp),
        profit: Number(day.net_profit_gbp),
        deals: day.deal_count,
      })),
    [data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <span className="text-sm text-muted-foreground">Period:</span>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">Retailer:</span>
        <Select value={retailer} onValueChange={setRetailer}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            {RETAILERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">Channel:</span>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            {CHANNELS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canExport ? (
          <div className="ml-auto flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <a href={`/api/v1/analytics/export?${queryString}`} download>
                <Download aria-hidden /> Export CSV
              </a>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="ghost" size="sm" disabled>
                    <Download aria-hidden /> Export XLSX
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                XLSX export arrives with the Analytics Service backend.
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <p className="ml-auto text-xs text-muted-foreground">
            Exports are available on Pro and Business plans.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data ? (
          <>
            <StatCard
              value={gbpWhole(data.stats.net_profit_gbp)}
              label="Net Profit"
            />
            <StatCard
              value={String(data.stats.deals_closed)}
              label="Deals Closed"
            />
            <StatCard value={pct(data.stats.avg_roi_pct)} label="Avg ROI" />
            <StatCard
              value={gbpWhole(data.stats.best_month_gbp)}
              label="Best Month"
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))
        )}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold">Revenue &amp; Profit</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Daily gross revenue with net profit overlay — hover for deal counts
        </p>
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart data={chartData} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={32}
                tickFormatter={(value: string) => shortDate(value)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(value: number) => `£${value.toFixed(0)}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => shortDate(String(label))}
                    formatter={(value, name, item, index) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {name === "revenue" ? "Gross Revenue" : "Net Profit"}
                        </span>
                        <span className="font-medium tabular-nums">
                          £{Number(value).toFixed(2)}
                          {index === 1
                            ? ` · ${item.payload.deals} deal${item.payload.deals === 1 ? "" : "s"}`
                            : ""}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={2} />
              <Bar dataKey="profit" fill="var(--color-profit)" radius={2} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data ? (
          <>
            <PerformancePanel
              title="Sell Channel Performance"
              rows={data.channel_performance.map((row) => ({
                name: row.channel_label,
                profit: row.profit_gbp,
                deals: row.deal_count,
                margin: row.avg_margin_pct,
              }))}
            />
            <PerformancePanel
              title="Source Retailer Performance"
              rows={data.retailer_performance.map((row) => ({
                name: row.retailer,
                profit: row.profit_gbp,
                deals: row.deal_count,
                margin: row.avg_margin_pct,
              }))}
            />
          </>
        ) : (
          <>
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Buy</TableHead>
              <TableHead className="text-right">Sell</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Net Profit</TableHead>
              <TableHead className="text-right">ROI %</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.records ?? []).map((record) => (
              <TableRow key={record.id}>
                <TableCell className="text-muted-foreground">
                  {shortDate(record.closed_at)}
                </TableCell>
                <TableCell className="font-medium">
                  {record.sku_title}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {gbp(record.buy_price_gbp)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {record.sell_price_gbp ? gbp(record.sell_price_gbp) : "—"}
                </TableCell>
                <TableCell>{record.sell_channel_label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {record.net_profit_gbp ? gbp(record.net_profit_gbp) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {record.net_margin_pct ? pct(record.net_margin_pct) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="secondary"
                    className={STATUS_STYLES[record.status]}
                  >
                    {record.status === "sold"
                      ? "Sold"
                      : record.status === "listed"
                        ? "Listed"
                        : "Failed"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {data && data.records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-muted-foreground"
                >
                  No closed deals in this period.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
