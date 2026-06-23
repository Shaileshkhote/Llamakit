"use client";

import type { EChartsOption } from "echarts";
import { useEffect, useMemo, useState } from "react";
import { EChart } from "@/components/charts/EChart";
import { formatUsd, isCompletedUtcDay } from "@/lib/format";
import type { ChartMetricKey, DashboardData, MetricSeries } from "@/types/metrics";

const metricOptions: Array<{
  key: ChartMetricKey;
  label: string;
  color: string;
  dotClass: string;
  render: "bar" | "line";
}> = [
  { key: "tvl", label: "TVL", color: "#111111", dotClass: "bg-[var(--text)]", render: "line" },
  {
    key: "dexVolume",
    label: "DEX Volume",
    color: "#2563eb",
    dotClass: "bg-[#2563eb]",
    render: "bar",
  },
  { key: "fees", label: "Fees", color: "#16a34a", dotClass: "bg-[#16a34a]", render: "bar" },
  {
    key: "revenue",
    label: "Revenue",
    color: "#f97316",
    dotClass: "bg-[#f97316]",
    render: "bar",
  },
  {
    key: "holdersRevenue",
    label: "Holder Revenue",
    color: "#9333ea",
    dotClass: "bg-[#9333ea]",
    render: "bar",
  },
  {
    key: "tokenPrice",
    label: "Token Price",
    color: "#0891b2",
    dotClass: "bg-[#0891b2]",
    render: "line",
  },
];

const rangeOptions = [
  { key: "30D", days: 30 },
  { key: "90D", days: 90 },
  { key: "1Y", days: 365 },
  { key: "ALL", days: null },
];

type ChartMode = "indexed" | "usd";
const segmentButtonClass =
  "inline-flex min-h-[34px] items-center gap-[7px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--muted)]";
const activeSegmentButtonClass = `${segmentButtonClass} border-[var(--text)] bg-[var(--text)] text-[var(--surface)]`;

export function MetricChart({
  data,
  accentColor: _accentColor,
}: {
  data: DashboardData;
  accentColor: string;
}) {
  const available = metricOptions.filter((option) => data.metrics[option.key]?.points.length);
  const initialMetrics = available
    .slice(0, Math.min(4, available.length))
    .map((option) => option.key);
  const [selectedMetrics, setSelectedMetrics] = useState<ChartMetricKey[]>(initialMetrics);
  const [range, setRange] = useState("90D");
  const [mode, setMode] = useState<ChartMode>("usd");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const activeRange = rangeOptions.find((option) => option.key === range) ?? rangeOptions[1];

  useEffect(() => {
    function syncTheme() {
      setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    }

    syncTheme();
    window.addEventListener("llamakit-theme-change", syncTheme);
    return () => window.removeEventListener("llamakit-theme-change", syncTheme);
  }, []);

  const option = useMemo<EChartsOption>(() => {
    const isDark = theme === "dark";
    const colors = {
      axis: isDark ? "#a7afb9" : "#666666",
      border: isDark ? "#39414c" : "#d4d4d4",
      grid: isDark ? "#252b33" : "#f0f0f0",
      handle: isDark ? "#101317" : "#ffffff",
      surface: isDark ? "#101317" : "#ffffff",
      surfaceMuted: isDark ? "#171b21" : "#f7f7f7",
      text: isDark ? "#f6f7f9" : "#111111",
      tvl: isDark ? "#f6f7f9" : "#111111",
    };
    const cutoff = activeRange.days
      ? Math.floor(Date.now() / 1000) - activeRange.days * 24 * 60 * 60
      : 0;
    const activeSeries = selectedMetrics
      .map((metric) => {
        const series = data.metrics[metric];
        const meta = metricOptions.find((item) => item.key === metric);
        return series && meta ? { series, meta } : null;
      })
      .filter((item): item is { series: MetricSeries; meta: (typeof metricOptions)[number] } =>
        Boolean(item),
      );
    const activeWithPoints = activeSeries
      .map((item, index) => {
        const points = item.series.points.filter(
          (point) =>
            point.timestamp >= cutoff && point.value != null && isCompletedUtcDay(point.timestamp),
        );
        const base = points.find((point) => point.value && point.value > 0)?.value ?? null;
        return { ...item, axisIndex: mode === "indexed" ? 0 : index, base, points };
      })
      .filter((item) => item.points.length > 0);
    const rightAxisCount = Math.max(0, activeWithPoints.length - 1);
    const gridRight = mode === "indexed" ? 26 : Math.min(280, 34 + rightAxisCount * 58);
    const maxTimestamp =
      Math.max(
        ...activeWithPoints.flatMap((item) => item.points.map((point) => point.timestamp)),
        0,
      ) || null;

    return {
      color: activeSeries.map(({ meta }) => (meta.key === "tvl" ? colors.tvl : meta.color)),
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          filterMode: "none",
        },
        {
          type: "slider",
          xAxisIndex: 0,
          filterMode: "none",
          height: 34,
          bottom: 14,
          borderColor: colors.border,
          backgroundColor: colors.surfaceMuted,
          fillerColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(17, 17, 17, 0.12)",
          handleColor: colors.handle,
          handleStyle: { borderColor: colors.text },
          moveHandleStyle: { color: colors.text },
          selectedDataBackground: {
            lineStyle: { color: colors.text },
            areaStyle: {
              color: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(17, 17, 17, 0.08)",
            },
          },
          textStyle: { color: colors.axis },
        },
      ],
      grid: { left: 58, right: gridRight, top: 28, bottom: 82 },
      legend: {
        show: false,
        icon: "circle",
        itemHeight: 8,
        itemWidth: 8,
        textStyle: { color: colors.axis, fontSize: 12 },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        className: "lk-chart-tooltip",
        textStyle: { color: colors.text, fontSize: 12 },
        valueFormatter: (value) =>
          mode === "indexed" ? `${Number(value).toFixed(1)}` : formatUsd(Number(value)),
      },
      xAxis: {
        type: "time",
        max: maxTimestamp ? maxTimestamp * 1000 : undefined,
        axisLine: { lineStyle: { color: colors.border } },
        axisLabel: { color: colors.axis },
        axisPointer: { lineStyle: { color: colors.axis, type: "dashed" } },
      },
      yAxis:
        mode === "indexed"
          ? {
              type: "value",
              axisLabel: { color: colors.axis, formatter: (value: number) => `${value}` },
              splitLine: { lineStyle: { color: colors.grid } },
            }
          : activeWithPoints.map(({ meta }, index) => ({
              type: "value",
              name: meta.label,
              nameGap: 8,
              nameTextStyle: { color: meta.color, fontSize: 11, fontWeight: 600 },
              position: index === 0 ? "left" : "right",
              offset: index <= 1 ? 0 : (index - 1) * 58,
              scale: true,
              axisLine: { show: index !== 0, lineStyle: { color: meta.color } },
              axisTick: { show: index !== 0, lineStyle: { color: meta.color } },
              axisLabel: {
                color: index === 0 ? colors.axis : meta.color,
                formatter: formatAxisValue,
              },
              splitLine: { show: index === 0, lineStyle: { color: colors.grid } },
            })),
      series: activeWithPoints.map(({ axisIndex, base, meta, points }) => {
        const isBar = mode === "usd" && meta.render === "bar";
        const color = meta.key === "tvl" ? colors.tvl : meta.color;
        return {
          type: isBar ? "bar" : "line",
          name: meta.label,
          yAxisIndex: axisIndex,
          showSymbol: false,
          smooth: !isBar,
          barMaxWidth: 5,
          itemStyle: { color, opacity: isBar ? 0.72 : 1 },
          lineStyle: { width: meta.key === "tvl" ? 2.5 : 2, color },
          areaStyle:
            !isBar && meta.key === "tvl"
              ? { color: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(17, 17, 17, 0.08)" }
              : undefined,
          emphasis: { focus: "series" },
          data: points.map((point) => [
            point.timestamp * 1000,
            mode === "indexed" && base ? ((point.value ?? 0) / base) * 100 : point.value,
          ]),
        };
      }),
    };
  }, [activeRange.days, data.metrics, mode, selectedMetrics, theme]);

  function toggleMetric(metric: ChartMetricKey) {
    setSelectedMetrics((current) => {
      if (current.includes(metric)) {
        return current.length === 1 ? current : current.filter((item) => item !== metric);
      }
      return [...current, metric];
    });
  }

  if (available.length === 0) return null;

  return (
    <section
      className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
      id="performance"
    >
      <div className="flex items-start justify-between gap-4 max-[760px]:flex-col">
        <div>
          <p className="m-0 text-[13px] font-semibold text-[var(--muted)]">Verified metrics</p>
          <h2 className="mb-0 mt-1.5 text-2xl">Performance</h2>
          <p className="mt-1.5 max-w-[680px] text-[13px] leading-[1.45] text-[var(--muted)]">
            Compare metrics on independent scales. Use the lower range bar for fine-grained history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Chart display mode">
          {(["indexed", "usd"] as ChartMode[]).map((item) => (
            <button
              aria-pressed={mode === item}
              className={mode === item ? activeSegmentButtonClass : segmentButtonClass}
              key={item}
              onClick={() => setMode(item)}
              type="button"
            >
              {item === "indexed" ? "Indexed" : "USD"}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2 mt-4 flex flex-wrap justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {available.map((option) => (
            <button
              aria-pressed={selectedMetrics.includes(option.key)}
              className={
                selectedMetrics.includes(option.key) ? activeSegmentButtonClass : segmentButtonClass
              }
              key={option.key}
              onClick={() => toggleMetric(option.key)}
              type="button"
            >
              <span className={`size-2 rounded-full ${option.dotClass}`} />
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Chart time range">
          {rangeOptions.map((option) => (
            <button
              aria-pressed={range === option.key}
              className={range === option.key ? activeSegmentButtonClass : segmentButtonClass}
              key={option.key}
              onClick={() => setRange(option.key)}
              type="button"
            >
              {option.key}
            </button>
          ))}
        </div>
      </div>
      <EChart className="h-[470px]" option={option} />
    </section>
  );
}

function formatAxisValue(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `$${trimNumber(value / 1_000_000_000_000)}T`;
  if (abs >= 1_000_000_000) return `$${trimNumber(value / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `$${trimNumber(value / 1_000_000)}M`;
  if (abs >= 1_000) return `$${trimNumber(value / 1_000)}K`;
  if (abs >= 1) return `$${trimNumber(value)}`;
  return `$${value.toFixed(2)}`;
}

function trimNumber(value: number) {
  return value >= 10 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "");
}
