import { cachedMetricFetch, CACHE_TTL_SECONDS } from "@/lib/caching/metric-cache";
import { fetchFeeLikeSeries, fetchDexVolumeSeries } from "@/lib/defillama/dimensions";
import { fetchTokenPriceSeries } from "@/lib/defillama/prices";
import { fetchStablecoinSupplySeries } from "@/lib/defillama/stablecoins";
import { fetchTvlSeries } from "@/lib/defillama/tvl";
import { fetchYieldPools } from "@/lib/defillama/yields";
import { normalizeMethodologyText } from "@/lib/normalization/methodology";
import { patchTenant } from "@/lib/tenancy/store";
import type { DashboardData, MetricKey, MetricSeries, ProtocolCapabilities } from "@/types/metrics";
import { EMPTY_CAPABILITIES } from "@/types/metrics";
import type { Tenant } from "@/types/tenant";

async function getMetric(tenant: Tenant, metric: MetricKey): Promise<MetricSeries> {
  const sources = tenant.metricSources;

  switch (metric) {
    case "tvl":
      return cachedMetricFetch(tenant.id, metric, CACHE_TTL_SECONDS.tvl, () =>
        aggregateMetric(
          metric,
          "TVL",
          sourceList(sources.tvlProtocols, sources.tvlProtocol),
          fetchTvlSeries,
        ),
      );
    case "fees":
      if (!sources.feesProtocol && !sources.feesProtocols?.length)
        return unsupported(metric, "Fees");
      return cachedMetricFetch(tenant.id, metric, CACHE_TTL_SECONDS.fees, () =>
        aggregateMetric(
          metric,
          "Fees",
          sourceList(sources.feesProtocols, sources.feesProtocol),
          (source) => fetchFeeLikeSeries(source, "fees"),
        ),
      );
    case "revenue":
      if (!sources.feesProtocol && !sources.feesProtocols?.length)
        return unsupported(metric, "Revenue");
      return cachedMetricFetch(tenant.id, metric, CACHE_TTL_SECONDS.revenue, () =>
        aggregateMetric(
          metric,
          "Revenue",
          sourceList(sources.feesProtocols, sources.feesProtocol),
          (source) => fetchFeeLikeSeries(source, "revenue"),
        ),
      );
    case "holdersRevenue":
      if (!sources.feesProtocol && !sources.feesProtocols?.length)
        return unsupported(metric, "Holder Revenue");
      return cachedMetricFetch(tenant.id, metric, CACHE_TTL_SECONDS.holdersRevenue, () =>
        aggregateMetric(
          metric,
          "Holder Revenue",
          sourceList(sources.feesProtocols, sources.feesProtocol),
          (source) => fetchFeeLikeSeries(source, "holdersRevenue"),
        ),
      );
    case "dexVolume":
      if (!sources.dexProtocol && !sources.dexProtocols?.length)
        return unsupported(metric, "DEX Volume");
      return cachedMetricFetch(tenant.id, metric, CACHE_TTL_SECONDS.dexVolume, () =>
        aggregateMetric(
          metric,
          "DEX Volume",
          sourceList(sources.dexProtocols, sources.dexProtocol),
          fetchDexVolumeSeries,
        ),
      );
    case "tokenPrice":
      if (!sources.priceId) return unsupported(metric, "Token Price");
      return cachedMetricFetch(tenant.id, metric, CACHE_TTL_SECONDS.tokenPrice, () =>
        fetchTokenPriceSeries(sources.priceId!),
      );
    case "stablecoinSupply":
      if (!sources.stablecoinAssetId) return unsupported(metric, "Stablecoin Supply");
      return cachedMetricFetch(tenant.id, metric, CACHE_TTL_SECONDS.stablecoinSupply, () =>
        fetchStablecoinSupplySeries(sources.stablecoinAssetId!),
      );
    case "optionsVolume":
      return unsupported(metric, "Options Volume");
  }
}

function sourceList(values: string[] | undefined, fallback: string | null | undefined) {
  return Array.from(
    new Set([...(values ?? []), fallback].filter((value): value is string => Boolean(value))),
  );
}

async function aggregateMetric(
  metric: MetricKey,
  label: string,
  sources: string[],
  fetcher: (source: string) => Promise<MetricSeries>,
): Promise<MetricSeries> {
  if (sources.length === 0) return unsupported(metric, label);
  if (sources.length === 1) return fetcher(sources[0]);

  const settled = await Promise.allSettled(sources.map((source) => fetcher(source)));
  const series = settled
    .filter(
      (result): result is PromiseFulfilledResult<MetricSeries> => result.status === "fulfilled",
    )
    .map((result) => result.value)
    .filter(isSupported);

  if (series.length === 0) return unsupported(metric, label);

  const pointsByTimestamp = new Map<number, number>();
  const chainBreakdown: Record<string, number> = {};
  for (const item of series) {
    for (const point of item.points) {
      if (point.value == null) continue;
      pointsByTimestamp.set(
        point.timestamp,
        (pointsByTimestamp.get(point.timestamp) ?? 0) + point.value,
      );
    }

    for (const [chain, value] of Object.entries(item.chainBreakdown ?? {})) {
      chainBreakdown[chain] = (chainBreakdown[chain] ?? 0) + value;
    }
  }

  const points = Array.from(pointsByTimestamp.entries())
    .map(([timestamp, value]) => ({ timestamp, value }))
    .sort((a, b) => a.timestamp - b.timestamp);
  const methodologies = uniqueStrings(
    series.map((item) => normalizeMethodologyText(item.methodology)),
  );
  const sourceUrls = uniqueStrings(series.map((item) => item.sourceUrl));

  return {
    metric,
    label,
    current: sumNullable(series.map((item) => item.current)),
    total24h: sumNullable(series.map((item) => item.total24h)),
    total7d: sumNullable(series.map((item) => item.total7d)),
    total30d: sumNullable(series.map((item) => item.total30d)),
    totalAllTime: sumNullable(series.map((item) => item.totalAllTime)),
    points,
    chainBreakdown: Object.keys(chainBreakdown).length ? chainBreakdown : undefined,
    methodology: methodologies.join("\n\n") || null,
    source: "DefiLlama",
    sourceUrl: sourceUrls.join("\n"),
    lastDataAt: Math.max(...series.map((item) => item.lastDataAt ?? 0)) || null,
    status: series.some((item) => item.status === "ok") ? "ok" : "stale",
  };
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function sumNullable(values: Array<number | null | undefined>) {
  const realValues = values.filter(
    (value): value is number => value != null && Number.isFinite(value),
  );
  if (realValues.length === 0) return null;
  return realValues.reduce((sum, value) => sum + value, 0);
}

function unsupported(metric: MetricKey, label: string): MetricSeries {
  return {
    metric,
    label,
    current: null,
    points: [],
    source: "DefiLlama",
    sourceUrl: "",
    lastDataAt: null,
    status: "unsupported",
  };
}

function isSupported(series: MetricSeries) {
  return series.status === "ok" || series.status === "stale";
}

export async function detectCapabilities(tenant: Tenant): Promise<ProtocolCapabilities> {
  const metricKeys: MetricKey[] = [
    "tvl",
    "fees",
    "revenue",
    "holdersRevenue",
    "dexVolume",
    "optionsVolume",
    "tokenPrice",
    "stablecoinSupply",
  ];

  const settled = await Promise.allSettled(metricKeys.map((metric) => getMetric(tenant, metric)));
  const capabilities = { ...EMPTY_CAPABILITIES };

  settled.forEach((result, index) => {
    const metric = metricKeys[index];
    capabilities[metric] = result.status === "fulfilled" && isSupported(result.value);
  });

  try {
    const pools = await fetchYieldPools(tenant.metricSources.yieldProjects);
    capabilities.yields = pools.length > 0;
  } catch {
    capabilities.yields = false;
  }

  await patchTenant(tenant.slug, { capabilities });
  return capabilities;
}

export async function getDashboardData(tenant: Tenant): Promise<DashboardData> {
  const metricKeys: MetricKey[] = [
    "tvl",
    "fees",
    "revenue",
    "holdersRevenue",
    "dexVolume",
    "tokenPrice",
    "stablecoinSupply",
  ];
  const settled = await Promise.allSettled(metricKeys.map((metric) => getMetric(tenant, metric)));
  const metrics: DashboardData["metrics"] = {};

  settled.forEach((result, index) => {
    if (result.status === "fulfilled" && isSupported(result.value)) {
      metrics[metricKeys[index]] = result.value;
    }
  });

  let yieldPools: DashboardData["yieldPools"] = [];
  try {
    yieldPools = await fetchYieldPools(tenant.metricSources.yieldProjects);
  } catch {
    yieldPools = [];
  }

  return {
    tenantSlug: tenant.slug,
    generatedAt: Math.floor(Date.now() / 1000),
    capabilities: {
      ...tenant.capabilities,
      yields: yieldPools.length > 0,
    },
    metrics,
    yieldPools,
  };
}
