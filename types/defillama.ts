export type DefiLlamaProtocolListItem = {
  id?: string
  name: string
  symbol?: string
  slug: string
  category?: string
  chains?: string[]
  tvl?: number
  change_1d?: number
  change_7d?: number
  logo?: string
  url?: string
  parentProtocol?: string | null
}

export type ProtocolSearchResult = {
  name: string
  slug: string
  symbol: string | null
  category: string | null
  chains: string[]
  tvl: number | null
  logo: string | null
  parentProtocol: string | null
  childProtocols: Array<{
    name: string
    slug: string
    category: string | null
    tvl: number | null
  }>
}
