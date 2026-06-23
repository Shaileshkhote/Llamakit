import { createSeries } from "@/lib/normalization/series";
import { normalizeMethodologyText } from "@/lib/normalization/methodology";
import type { MetricKey, MetricSeries } from "@/types/metrics";
import { fetchJson } from "./client";

type DimensionResponse = {
  total24h?: number;
  total7d?: number;
  total30d?: number;
  totalAllTime?: number;
  totalDataChart?: Array<[number, number]>;
  totalDataChartBreakdown?: Array<[number, Record<string, number>]>;
  methodology?: unknown;
};

const dimensionLabels: Record<MetricKey, string> = {
  tvl: "TVL",
  fees: "Fees",
  revenue: "Revenue",
  holdersRevenue: "Holder Revenue",
  dexVolume: "DEX Volume",
  optionsVolume: "Options Volume",
  tokenPrice: "Token Price",
  stablecoinSupply: "Stablecoin Supply",
};

function latestBreakdown(payload: DimensionResponse) {
  const latest = payload.totalDataChartBreakdown?.at(-1)?.[1];
  return latest ?? undefined;
}

export async function fetchFeeLikeSeries(
  protocol: string,
  metric: "fees" | "revenue" | "holdersRevenue",
): Promise<MetricSeries> {
  const dataType =
    metric === "fees" ? "dailyFees" : metric === "revenue" ? "dailyRevenue" : "dailyHoldersRevenue";
  const sourceUrl = `https://api.llama.fi/summary/fees/${protocol}?dataType=${dataType}`;
  const payload = await fetchJson<DimensionResponse>(sourceUrl);

  return createSeries({
    metric,
    label: dimensionLabels[metric],
    sourceUrl,
    points: payload.totalDataChart,
    current: payload.total24h,
    total24h: payload.total24h,
    total7d: payload.total7d,
    total30d: payload.total30d,
    totalAllTime: payload.totalAllTime,
    chainBreakdown: latestBreakdown(payload),
    methodology: normalizeMethodologyText(payload.methodology),
  });
}

export async function fetchDexVolumeSeries(protocol: string): Promise<MetricSeries> {
  const sourceUrl = `https://api.llama.fi/summary/dexs/${protocol}?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=false`;
  const payload = await fetchJson<DimensionResponse>(sourceUrl);

  return createSeries({
    metric: "dexVolume",
    label: "DEX Volume",
    sourceUrl,
    points: payload.totalDataChart,
    current: payload.total24h,
    total24h: payload.total24h,
    total7d: payload.total7d,
    total30d: payload.total30d,
    totalAllTime: payload.totalAllTime,
    chainBreakdown: latestBreakdown(payload),
    methodology: normalizeMethodologyText(payload.methodology),
  });
}
