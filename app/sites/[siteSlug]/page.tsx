import { notFound } from "next/navigation";
import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";
import { ProtocolHeader } from "@/components/dashboard/ProtocolHeader";
import { getDashboardData } from "@/lib/data/dashboard";
import { getAnalyticsSiteBySlugOrHost } from "@/lib/tenancy/store";

export const dynamic = "force-dynamic";

export default async function AnalyticsSitePage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const site = await getAnalyticsSiteBySlugOrHost(decodeURIComponent(siteSlug));

  if (!site || !site.published) notFound();

  const data = await getDashboardData(site);

  return (
    <main
      className="overflow-x-clip"
      style={
        {
          "--accent": site.accentColor,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto grid min-w-0 w-[min(1160px,calc(100vw-40px))] gap-3.5 overflow-x-clip py-[18px] pb-8 max-[760px]:w-[min(1160px,calc(100vw-24px))]">
        <ProtocolHeader tenant={site} data={data} />
        <DashboardWorkspace tenant={site} data={data} />
        <footer className="text-xs text-[var(--soft)]">
          Unofficial LlamaKit prototype. Data provided by DefiLlama.
        </footer>
      </div>
    </main>
  );
}
