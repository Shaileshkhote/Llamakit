import type { Tenant } from "@/types/tenant"
import { EMPTY_CAPABILITIES } from "@/types/metrics"

const now = new Date().toISOString()

const defaultModules = {
  overview: true,
  performance: true,
  chains: true,
  economics: true,
  yields: true,
  methodology: true
}

export const seedTenants: Tenant[] = [
  {
    id: "tenant-uniswap",
    slug: "uniswap",
    displayName: "Uniswap",
    protocolDescription:
      "Protocol-owned analytics portal for Uniswap metrics sourced from DefiLlama public APIs.",
    logoUrl: "https://icons.llamao.fi/icons/protocols/uniswap",
    websiteUrl: "https://uniswap.org",
    twitterUrl: "https://x.com/Uniswap",
    primaryColor: "#ff007a",
    accentColor: "#2172e5",
    backgroundStyle: "light",
    metricSources: {
      tvlProtocol: "uniswap",
      tvlProtocols: ["uniswap"],
      feesProtocol: "uniswap",
      feesProtocols: ["uniswap"],
      dexProtocol: "uniswap",
      dexProtocols: ["uniswap"],
      optionsProtocol: null,
      optionsProtocols: [],
      yieldProjects: ["uniswap-v2", "uniswap-v3", "uniswap-v4"],
      priceId: "coingecko:uniswap",
      stablecoinAssetId: null,
      parentProtocol: null,
      childProtocols: ["uniswap"]
    },
    capabilities: { ...EMPTY_CAPABILITIES, tvl: true, fees: true, revenue: true, holdersRevenue: true, dexVolume: true, yields: true, tokenPrice: true },
    enabledModules: defaultModules,
    published: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "tenant-aave",
    slug: "aave",
    displayName: "Aave",
    protocolDescription:
      "A branded Aave analytics surface that demonstrates non-DEX protocol rendering.",
    logoUrl: "https://icons.llamao.fi/icons/protocols/aave",
    websiteUrl: "https://aave.com",
    twitterUrl: "https://x.com/aave",
    primaryColor: "#2ebac6",
    accentColor: "#b6509e",
    backgroundStyle: "light",
    metricSources: {
      tvlProtocol: "aave",
      tvlProtocols: ["aave"],
      feesProtocol: "aave",
      feesProtocols: ["aave"],
      dexProtocol: null,
      dexProtocols: [],
      optionsProtocol: null,
      optionsProtocols: [],
      yieldProjects: ["aave-v3"],
      priceId: "coingecko:aave",
      stablecoinAssetId: null,
      parentProtocol: null,
      childProtocols: ["aave"]
    },
    capabilities: { ...EMPTY_CAPABILITIES, tvl: true, fees: true, revenue: true, yields: true, tokenPrice: true },
    enabledModules: defaultModules,
    published: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "tenant-lido",
    slug: "lido",
    displayName: "Lido",
    protocolDescription:
      "A staking-focused tenant used to prove that LlamaKit hides unsupported modules cleanly.",
    logoUrl: "https://icons.llamao.fi/icons/protocols/lido",
    websiteUrl: "https://lido.fi",
    twitterUrl: "https://x.com/lidofinance",
    primaryColor: "#00a3ff",
    accentColor: "#00b894",
    backgroundStyle: "light",
    metricSources: {
      tvlProtocol: "lido",
      tvlProtocols: ["lido"],
      feesProtocol: "lido",
      feesProtocols: ["lido"],
      dexProtocol: null,
      dexProtocols: [],
      optionsProtocol: null,
      optionsProtocols: [],
      yieldProjects: ["lido"],
      priceId: "coingecko:lido-dao",
      stablecoinAssetId: null,
      parentProtocol: null,
      childProtocols: ["lido"]
    },
    capabilities: { ...EMPTY_CAPABILITIES, tvl: true, fees: true, revenue: true, holdersRevenue: true, yields: true, tokenPrice: true },
    enabledModules: defaultModules,
    published: true,
    createdAt: now,
    updatedAt: now
  }
]
