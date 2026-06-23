import type { DashboardData } from "@/types/metrics";
import type { AnalyticsSite } from "@/types/site";
import { formatTimestamp } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type LinkIcon = "website" | "data" | "docs" | "forum" | "x" | "discord" | "launch";

type ProjectLink = {
  href: string | null | undefined;
  icon: LinkIcon;
  label: string;
};

const knownProjectLinks: Record<
  string,
  { app?: string; discord?: string; docs?: string; forum?: string; website?: string; x?: string }
> = {
  pancakeswap: {
    app: "https://pancakeswap.finance/swap",
    discord: "https://discord.gg/pancakeswap",
    docs: "https://docs.pancakeswap.finance/",
    forum: "https://forum.pancakeswap.finance/",
    website: "https://pancakeswap.finance/",
    x: "https://x.com/PancakeSwap",
  },
};

export function ProtocolHeader({ tenant, data }: { tenant: AnalyticsSite; data: DashboardData }) {
  const latest = Object.values(data.metrics).reduce(
    (max, metric) => Math.max(max, metric?.lastDataAt ?? 0),
    0,
  );
  const defillamaProtocol = cleanDefillamaProtocol(
    tenant.metricSources.parentProtocol ?? tenant.metricSources.tvlProtocol,
  );
  const knownLinks = knownProjectLinks[tenant.slug] ?? {};
  const brandName = tenant.displayName.replace(/\s+ecosystem$/i, "");
  const websiteUrl = tenant.websiteUrl ?? knownLinks.website;
  const xUrl = tenant.twitterUrl ?? knownLinks.x;
  const links: ProjectLink[] = [
    { href: websiteUrl, icon: "website", label: "Website" },
    { href: `https://defillama.com/protocol/${defillamaProtocol}`, icon: "data", label: "Data" },
    { href: knownLinks.docs, icon: "docs", label: "Docs" },
    { href: knownLinks.forum, icon: "forum", label: "Forum" },
    { href: xUrl, icon: "x", label: "X" },
    { href: knownLinks.discord, icon: "discord", label: "Discord" },
  ];
  const launchUrl = knownLinks.app ?? websiteUrl;

  return (
    <header className="py-[18px] pb-[22px]">
      <div className="mb-3.5 flex items-center justify-between gap-[18px] border-b border-[var(--border)] pb-[18px] max-[760px]:flex-col max-[760px]:items-start">
        <a
          className="inline-flex items-center gap-2.5 text-[15px] font-bold text-[var(--text)]"
          href={websiteUrl ?? `/sites/${tenant.slug}`}
        >
          {tenant.logoUrl ? (
            <img
              alt=""
              className="grid size-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] object-cover text-[11px] text-[var(--text)]"
              src={tenant.logoUrl}
            />
          ) : (
            <span className="grid size-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[11px] text-[var(--text)]">
              {brandName.slice(0, 2).toUpperCase()}
            </span>
          )}
          <strong>{brandName}</strong>
        </a>

        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-semibold text-[var(--muted)] max-[760px]:w-full max-[760px]:gap-3.5"
          aria-label={`${tenant.displayName} links`}
        >
          <ThemeToggle />
          {links.map((link) =>
            link.href ? (
              <a
                className="inline-flex items-center gap-[7px] whitespace-nowrap text-inherit hover:text-[var(--text)] [&_svg]:size-[17px] [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-2 [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]"
                href={link.href}
                key={link.label}
                target="_blank"
                rel="noreferrer"
              >
                <HeaderIcon icon={link.icon} />
                <span>{link.label}</span>
              </a>
            ) : null,
          )}
          {launchUrl ? (
            <a
              className="inline-flex min-h-[34px] items-center gap-2 whitespace-nowrap rounded-lg bg-[var(--text)] px-[13px] font-bold text-[var(--surface)] max-[760px]:justify-center [&_svg]:size-[17px] [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-2 [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]"
              href={launchUrl}
              target="_blank"
              rel="noreferrer"
            >
              Launch App
              <HeaderIcon icon="launch" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[var(--soft)]">
        <span>Project analytics</span>
        <StatusBadge status={latest ? "ok" : "stale"}>
          Fresh as of {formatTimestamp(latest)}
        </StatusBadge>
        <span>Data provided by DefiLlama</span>
      </div>
    </header>
  );
}

function cleanDefillamaProtocol(protocol: string) {
  return protocol.replace(/^parent#/, "");
}

function HeaderIcon({ icon }: { icon: LinkIcon }) {
  if (icon === "x") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 4l14 16M19 4L5 20" />
      </svg>
    );
  }

  if (icon === "discord") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M8 9.2c2.4-.8 5.6-.8 8 0M8.4 16.5c-1.3-.3-2.3-.8-3.1-1.4.2-3.8 1.3-6.6 3.2-8.4l2.1.8m5 9c1.3-.3 2.3-.8 3.1-1.4-.2-3.8-1.3-6.6-3.2-8.4l-2.1.8M9.2 13.2h.1m5.5 0h.1" />
      </svg>
    );
  }

  const paths: Record<Exclude<LinkIcon, "x" | "discord">, string> = {
    data: "M5 19V9m7 10V5m7 14v-7",
    docs: "M7 4h7l4 4v12H7zM14 4v5h4M10 13h5M10 16h5",
    forum: "M5 6h14v9H9l-4 4z",
    launch: "M7 17L17 7M9 7h8v8",
    website:
      "M12 3a9 9 0 100 18 9 9 0 000-18zM3.5 12h17M12 3c2.2 2.5 3.2 5.5 3.2 9s-1 6.5-3.2 9M12 3c-2.2 2.5-3.2 5.5-3.2 9s1 6.5 3.2 9",
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d={paths[icon]} />
    </svg>
  );
}
