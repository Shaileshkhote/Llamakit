import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getPublishedPublicAnalyticsSites } from "@/lib/tenancy/store";

export const dynamic = "force-dynamic";

const protocolOrbit = [
  {
    logo: "https://icons.llamao.fi/icons/protocols/uniswap",
    name: "Uniswap",
    nodeVars: "[--delay:0ms] [--tone:#ec4899] [--x:10%] [--y:20%] [--mx:6%] [--my:22%] [--ix:9%] [--iy:24%]",
    packetVars: "[--delay:0ms] [--tone:#ec4899] [--tx:199px] [--ty:104px] [--mtx:145px] [--mty:90px] [--itx:182px] [--ity:104px] [--x:10%] [--y:20%] [--mx:6%] [--my:22%] [--ix:9%] [--iy:24%]",
  },
  {
    logo: "https://icons.llamao.fi/icons/protocols/aave",
    name: "Aave",
    nodeVars: "[--delay:-520ms] [--tone:#8b5cf6] [--x:84%] [--y:21%] [--mx:82%] [--my:21%] [--ix:82%] [--iy:24%]",
    packetVars:
      "[--delay:-520ms] [--tone:#8b5cf6] [--tx:-215px] [--ty:100px] [--mtx:-128px] [--mty:90px] [--itx:-182px] [--ity:104px] [--x:84%] [--y:21%] [--mx:82%] [--my:21%] [--ix:82%] [--iy:24%]",
  },
  {
    logo: "https://icons.llamao.fi/icons/protocols/spark",
    name: "Spark",
    nodeVars: "[--delay:-1040ms] [--tone:#ff5a1f] [--x:9%] [--y:56%] [--mx:8%] [--my:50%] [--ix:10%] [--iy:52%]",
    packetVars:
      "[--delay:-1040ms] [--tone:#ff5a1f] [--tx:205px] [--ty:-51px] [--mtx:142px] [--mty:-10px] [--itx:180px] [--ity:-16px] [--x:9%] [--y:56%] [--mx:8%] [--my:50%] [--ix:10%] [--iy:52%]",
  },
  {
    logo: "https://icons.llamao.fi/icons/protocols/jupiter",
    name: "Jupiter",
    nodeVars: "[--delay:-1560ms] [--tone:#10b981] [--x:88%] [--y:53%] [--mx:85%] [--my:49%] [--ix:84%] [--iy:51%]",
    packetVars:
      "[--delay:-1560ms] [--tone:#10b981] [--tx:-238px] [--ty:-38px] [--mtx:-140px] [--mty:-6px] [--itx:-184px] [--ity:-12px] [--x:88%] [--y:53%] [--mx:85%] [--my:49%] [--ix:84%] [--iy:51%]",
  },
  {
    logo: "https://icons.llamao.fi/icons/protocols/pancakeswap",
    name: "PancakeSwap",
    nodeVars: "[--delay:-2080ms] [--tone:#f59e0b] [--x:24%] [--y:82%] [--mx:19%] [--my:77%] [--ix:22%] [--iy:78%]",
    packetVars:
      "[--delay:-2080ms] [--tone:#f59e0b] [--tx:121px] [--ty:-163px] [--mtx:105px] [--mty:-92px] [--itx:122px] [--ity:-156px] [--x:24%] [--y:82%] [--mx:19%] [--my:77%] [--ix:22%] [--iy:78%]",
  },
  {
    logo: "https://icons.llamao.fi/icons/protocols/lido",
    name: "Lido",
    nodeVars: "[--delay:-2600ms] [--tone:#0ea5e9] [--x:84%] [--y:88%] [--mx:79%] [--my:77%] [--ix:78%] [--iy:78%]",
    packetVars:
      "[--delay:-2600ms] [--tone:#0ea5e9] [--tx:-215px] [--ty:-188px] [--mtx:-110px] [--mty:-92px] [--itx:-122px] [--ity:-156px] [--x:84%] [--y:88%] [--mx:79%] [--my:77%] [--ix:78%] [--iy:78%]",
  },
  {
    logo: "https://icons.llamao.fi/icons/protocols/morpho",
    name: "Morpho",
    nodeVars: "[--delay:-3120ms] [--tone:#2563eb] [--x:53%] [--y:8%] [--mx:49%] [--my:7%] [--ix:50%] [--iy:9%]",
    packetVars:
      "[--delay:-3120ms] [--tone:#2563eb] [--tx:-42px] [--ty:156px] [--mtx:0px] [--mty:138px] [--itx:0px] [--ity:166px] [--x:53%] [--y:8%] [--mx:49%] [--my:7%] [--ix:50%] [--iy:9%]",
  },
  {
    logo: "https://icons.llamao.fi/icons/protocols/sky",
    name: "Sky",
    nodeVars: "[--delay:-3640ms] [--tone:#0ea5e9] [--x:34%] [--y:30%] [--mx:29%] [--my:29%] [--ix:31%] [--iy:31%]",
    packetVars:
      "[--delay:-3640ms] [--tone:#0ea5e9] [--tx:65px] [--ty:61px] [--mtx:72px] [--mty:64px] [--itx:88px] [--ity:70px] [--x:34%] [--y:30%] [--mx:29%] [--my:29%] [--ix:31%] [--iy:31%]",
  },
  {
    logo: "https://icons.llamao.fi/icons/protocols/hyperliquid",
    name: "Hyperliquid",
    nodeVars: "[--delay:-4160ms] [--tone:#10b981] [--x:58%] [--y:76%] [--mx:57%] [--my:83%] [--ix:54%] [--iy:87%]",
    packetVars:
      "[--delay:-4160ms] [--tone:#10b981] [--tx:-70px] [--ty:-137px] [--mtx:-28px] [--mty:-108px] [--itx:-32px] [--ity:-184px] [--x:58%] [--y:76%] [--mx:57%] [--my:83%] [--ix:54%] [--iy:87%]",
  },
];

const cardIndexClasses = [
  "[--card-index:0]",
  "[--card-index:1]",
  "[--card-index:2]",
  "[--card-index:3]",
  "[--card-index:4]",
  "[--card-index:5]",
];

export default async function HomePage() {
  const { sites } = await getPublishedPublicAnalyticsSites({ limit: 6 });

  return (
    <main className="lk-home mx-auto w-[min(1160px,calc(100vw-40px))] pb-14 max-[760px]:w-[min(1160px,calc(100vw-24px))]">
      <nav className="lk-home-nav flex items-center justify-between gap-[18px] py-[22px] max-[760px]:flex-col max-[760px]:items-start">
        <Link className="inline-flex items-center gap-2.5 text-[15px] font-bold" href="/">
          <span className="grid size-[30px] place-items-center rounded-full border border-[var(--border)] bg-[var(--text)] text-xs text-[var(--surface)]">
            DL
          </span>
          <span>DefiLlama</span>
        </Link>
        <div className="flex flex-wrap gap-2.5">
          <ThemeToggle />
          <Link
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-[11px] py-[7px] text-xs leading-none text-[var(--muted)]"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-[11px] py-[7px] text-xs leading-none text-[var(--muted)]">
            Unofficial LlamaKit prototype
          </span>
        </div>
      </nav>

      <section className="lk-home-hero py-[58px] pb-16 max-[640px]:py-7 max-[640px]:pb-9">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(500px,560px)] items-center gap-[clamp(34px,5vw,72px)] max-[1180px]:grid-cols-1 max-[900px]:gap-8 max-[640px]:gap-4">
          <div className="min-w-0">
            <p className="lk-home-kicker text-[13px] font-semibold text-[var(--muted)]">
              Analytics sites for protocols
            </p>
            <h1 className="lk-hero-title mt-0 mb-0 max-w-[720px] text-balance text-[clamp(46px,5.8vw,72px)] leading-[0.98] tracking-normal max-[760px]:text-[clamp(38px,11vw,52px)]">
              Launch a metrics dashboard without building the data stack
            </h1>
            <p className="lk-hero-copy mt-5 max-w-[650px] text-[18px] leading-[1.6] text-[var(--muted)] max-[760px]:text-[17px] max-[760px]:leading-[1.55] max-[640px]:mt-4 max-[640px]:text-[15px]">
              LlamaKit gives teams a hosted analytics site powered by DefiLlama-verified data
              endpoints, so they can publish TVL, volume, fees, revenue, and source provenance
              without coding the ingestion layer or charting system themselves.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                className="lk-home-cta inline-flex min-h-[42px] items-center justify-center rounded-lg border border-[var(--text)] bg-[var(--text)] px-[18px] text-sm font-bold text-[var(--surface)]"
                href="/signup"
              >
                Create analytics site
              </Link>
            </div>
          </div>

          <div className="lk-data-orbit" aria-label="DefiLlama verified data network">
            <span className="lk-data-orbit-aura" />
            <svg aria-hidden="true" className="lk-data-orbit-lines" preserveAspectRatio="none" viewBox="0 0 560 430">
              <path d="M81 111 C148 120 216 164 280 215" />
              <path d="M495 115 C416 124 340 164 280 215" />
              <path d="M75 266 C148 252 216 230 280 215" />
              <path d="M518 253 C432 244 352 226 280 215" />
              <path d="M159 378 C202 328 238 272 280 215" />
              <path d="M495 403 C420 352 346 284 280 215" />
              <path d="M322 59 C310 114 296 166 280 215" />
              <path d="M215 154 C236 172 258 194 280 215" />
              <path d="M350 352 C334 306 306 254 280 215" />
            </svg>
            <div className="lk-data-core">
              <span>
                <img alt="" src="https://defillama.com/favicon.ico" />
              </span>
            </div>
            {protocolOrbit.map((protocol) => (
              <span
                className={`lk-orbit-protocol-node ${protocol.nodeVars}`}
                key={protocol.name}
              >
                <img alt={protocol.name} src={protocol.logo} />
              </span>
            ))}
            {protocolOrbit.map((protocol) => (
              <i
                className={`lk-data-packet ${protocol.packetVars}`}
                key={`${protocol.name}-packet`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="lk-home-dashboards py-2 pb-[18px]">
        <h2 className="mb-[18px] mt-0 text-[28px]">Explore LlamaKit-powered analytics sites</h2>
        <div className="grid grid-cols-12 gap-3.5 max-[760px]:grid-cols-1">
          {sites.map((site, index) => (
            <Link
              className={`lk-home-dashboard-card group col-span-4 min-h-[190px] min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 max-[760px]:col-span-1 ${cardIndexClasses[index] ?? cardIndexClasses.at(-1)}`}
              href={site.defaultUrl}
              key={site.slug}
            >
              <div className="flex justify-between gap-3.5">
                <div>
                  <h3 className="m-0 text-2xl">{site.displayName}</h3>
                  <p className="leading-[1.55] text-[var(--muted)]">{site.protocolDescription}</p>
                </div>
                {site.logoUrl ? (
                  <img alt="" src={site.logoUrl} className="size-[42px] rounded-full" />
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(site.capabilities)
                  .filter(([, enabled]) => enabled)
                  .slice(0, 4)
                  .map(([capability]) => (
                    <span
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-[11px] py-[7px] text-xs leading-none text-[var(--muted)] transition group-hover:-translate-y-px group-hover:bg-[var(--surface)] group-hover:text-[var(--text)]"
                      key={capability}
                    >
                      {capability}
                    </span>
                  ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-[34px] text-xs text-[var(--soft)]">
        Unofficial LlamaKit prototype. Data provided by DefiLlama.
      </footer>
    </main>
  );
}
