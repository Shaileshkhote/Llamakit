import type { DefiLlamaProtocolListItem, ProtocolSearchResult } from "@/types/defillama"
import { fetchJson, safeNumber } from "./client"

const PROTOCOLS_URL = "https://api.llama.fi/protocols"

export async function fetchProtocols() {
  return fetchJson<DefiLlamaProtocolListItem[]>(PROTOCOLS_URL)
}

export async function searchProtocols(query: string): Promise<ProtocolSearchResult[]> {
  const normalized = query.trim().toLowerCase()
  const protocols = await fetchProtocols()
  const matching = protocols.filter((protocol) => {
    if (!normalized) return true
    return (
      protocol.name.toLowerCase().includes(normalized) ||
      protocol.slug.toLowerCase().includes(normalized) ||
      protocol.symbol?.toLowerCase().includes(normalized) ||
      protocol.parentProtocol?.toLowerCase().includes(normalized)
    )
  })

  const parentGroups = new Map<string, DefiLlamaProtocolListItem[]>()
  for (const protocol of protocols) {
    if (!protocol.parentProtocol) continue
    const parentSlug = protocol.parentProtocol.replace(/^parent#/, "")
    const current = parentGroups.get(parentSlug) ?? []
    current.push(protocol)
    parentGroups.set(parentSlug, current)
  }

  const parentResults = Array.from(parentGroups.entries())
    .filter(([parentSlug, children]) => {
      if (!normalized) return false
      return (
        parentSlug.includes(normalized) ||
        children.some((protocol) =>
          [protocol.name, protocol.slug, protocol.symbol, protocol.category]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalized))
        )
      )
    })
    .map(([parentSlug, children]) => {
      const sortedChildren = children.sort((a, b) => (safeNumber(b.tvl) ?? -1) - (safeNumber(a.tvl) ?? -1))
      const primary = sortedChildren[0]
      const displayName = inferParentDisplayName(parentSlug, sortedChildren)
      return {
        name: `${displayName} ecosystem`,
        slug: parentSlug,
        symbol: primary.symbol ?? null,
        category: "Parent protocol",
        chains: Array.from(new Set(sortedChildren.flatMap((protocol) => protocol.chains ?? []))),
        tvl: sortedChildren.reduce((sum, protocol) => sum + (safeNumber(protocol.tvl) ?? 0), 0),
        logo: primary.logo ?? null,
        parentProtocol: `parent#${parentSlug}`,
        childProtocols: sortedChildren.map((protocol) => ({
          name: protocol.name,
          slug: protocol.slug,
          category: protocol.category ?? null,
          tvl: safeNumber(protocol.tvl)
        }))
      } satisfies ProtocolSearchResult
    })

  const childResults = matching
    .map((protocol) => ({
      name: protocol.name,
      slug: protocol.slug,
      symbol: protocol.symbol ?? null,
      category: protocol.category ?? null,
      chains: protocol.chains ?? [],
      tvl: safeNumber(protocol.tvl),
      logo: protocol.logo ?? null,
      parentProtocol: protocol.parentProtocol ?? null,
      childProtocols: [
        {
          name: protocol.name,
          slug: protocol.slug,
          category: protocol.category ?? null,
          tvl: safeNumber(protocol.tvl)
        }
      ]
    }))

  const seen = new Set<string>()
  return [...parentResults, ...childResults]
    .filter((protocol) => {
      const key = `${protocol.parentProtocol ? "parent" : "child"}:${protocol.slug}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 25)
}

function inferParentDisplayName(parentSlug: string, children: DefiLlamaProtocolListItem[]) {
  const parentWords = parentSlug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
  const firstName = children[0]?.name
  if (!firstName) return parentWords

  const parentToken = parentWords.split(" ")[0]?.toLowerCase()
  if (parentToken && firstName.toLowerCase().includes(parentToken)) {
    const index = firstName.toLowerCase().indexOf(parentToken)
    return firstName.slice(index, index + parentToken.length).replace(/^\w/, (char) => char.toUpperCase())
  }

  return parentWords
}
