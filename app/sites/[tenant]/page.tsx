import { notFound } from "next/navigation";
import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";
import { ProtocolHeader } from "@/components/dashboard/ProtocolHeader";
import { getDashboardData } from "@/lib/data/dashboard";
import { getTenantBySlugOrHost } from "@/lib/tenancy/store";

export const dynamic = "force-dynamic";

export default async function TenantSitePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantParam } = await params;
  const tenant = await getTenantBySlugOrHost(decodeURIComponent(tenantParam));

  if (!tenant || !tenant.published) notFound();

  const data = await getDashboardData(tenant);

  return (
    <main
      style={
        {
          "--accent": tenant.accentColor,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto grid w-[min(1160px,calc(100vw-40px))] gap-3.5 py-[18px] pb-8 max-[760px]:w-[min(1160px,calc(100vw-24px))]">
        <ProtocolHeader tenant={tenant} data={data} />
        <DashboardWorkspace tenant={tenant} data={data} />
        <footer className="text-xs text-[var(--soft)]">
          Unofficial LlamaKit prototype. Data provided by DefiLlama.
        </footer>
      </div>
    </main>
  );
}
