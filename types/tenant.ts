import type { ProtocolCapabilities } from "./metrics"

export type TenantMetricSources = {
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

export type Tenant = {
  id: string
  slug: string
  displayName: string
  protocolDescription: string
  logoUrl: string | null
  websiteUrl: string | null
  twitterUrl: string | null
  primaryColor: string
  accentColor: string
  backgroundStyle: "light" | "soft" | "dark"
  metricSources: TenantMetricSources
  capabilities: ProtocolCapabilities
  enabledModules: EnabledModules
  published: boolean
  createdAt: string
  updatedAt: string
}

export type DomainStatus = "pending" | "verifying" | "active" | "failed"

export type TenantDomain = {
  id: string
  tenantId: string
  hostname: string
  type: "subdomain" | "custom"
  status: DomainStatus
  verificationData: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}
