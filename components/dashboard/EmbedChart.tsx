"use client"

import type { EChartsOption } from "echarts"
import { useMemo } from "react"
import { EChart } from "@/components/charts/EChart"
import type { MetricSeries } from "@/types/metrics"

export function EmbedChart({
  metric,
  accentColor,
  theme
}: {
  metric: MetricSeries
  accentColor: string
  theme: "light" | "dark"
}) {
  const option = useMemo<EChartsOption>(
    () => ({
      backgroundColor: theme === "dark" ? "#101827" : "#ffffff",
      color: [accentColor],
      grid: { left: 48, right: 16, top: 18, bottom: 34 },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "time",
        axisLabel: { color: theme === "dark" ? "#d9e0ea" : "#5c6b7d" },
        axisLine: { lineStyle: { color: theme === "dark" ? "#344256" : "#d9e0ea" } }
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: theme === "dark" ? "#d9e0ea" : "#5c6b7d",
          formatter: (value: number) =>
            value >= 1_000_000_000
              ? `$${(value / 1_000_000_000).toFixed(0)}B`
              : value >= 1_000_000
                ? `$${(value / 1_000_000).toFixed(0)}M`
                : `${value}`
        },
        splitLine: { lineStyle: { color: theme === "dark" ? "#223047" : "#edf1f6" } }
      },
      series: [
        {
          type: "line",
          name: metric.label,
          showSymbol: false,
          smooth: true,
          data: metric.points.map((point) => [point.timestamp * 1000, point.value])
        }
      ]
    }),
    [accentColor, metric, theme]
  )

  return <EChart className="h-[320px]" option={option} />
}
