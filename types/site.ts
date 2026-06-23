import type { ProtocolCapabilities } from "./metrics"

export type AnalyticsSiteMetricSources = {
  tvlProtocol: string
  tvlProtocols?: string[]
  feesProtocol: string | null
  feesProtocols?: string[]
  dexProtocol: string | null
  dexProtocols?: string[]
  optionsProtocol: string | null
  optionsProtocols?: string[]
  yieldProjects: string[]
  priceId: string | null
  stablecoinAssetId: string | null
  parentProtocol?: string | null
  childProtocols?: string[]
}

export type EnabledModules = {
  overview: boolean
  performance: boolean
  chains: boolean
  economics: boolean
  yields: boolean
  methodology: boolean
}

export type AnalyticsSite = {
  id: string
  ownerUserId: string | null
  slug: string
  displayName: string
  protocolDescription: string
  logoUrl: string | null
  websiteUrl: string | null
  twitterUrl: string | null
  primaryColor: string
  accentColor: string
  backgroundStyle: "light" | "soft" | "dark"
  metricSources: AnalyticsSiteMetricSources
  capabilities: ProtocolCapabilities
  enabledModules: EnabledModules
  published: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type DomainStatus = "pending" | "verifying" | "active" | "failed"

export type AnalyticsSiteDomain = {
  id: string
  analyticsSiteId: string
  hostname: string
  type: "subdomain" | "custom"
  status: DomainStatus
  verificationData: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type PublicAnalyticsSite = {
  slug: string
  displayName: string
  protocolDescription: string
  logoUrl: string | null
  websiteUrl: string | null
  twitterUrl: string | null
  primaryColor: string
  capabilities: ProtocolCapabilities
  publishedAt: string | null
  updatedAt: string
  defaultUrl: string
  customDomains: Array<{
    hostname: string
    status: DomainStatus
  }>
}
