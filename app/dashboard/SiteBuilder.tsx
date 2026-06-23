"use client";

import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { EMPTY_CAPABILITIES, type ProtocolCapabilities } from "@/types/metrics";
import type { User } from "@/types/auth";
import type { AnalyticsSite, AnalyticsSiteDomain, DnsRecord } from "@/types/site";

const Select = dynamic(() => import("react-select"), { ssr: false });

type ProtocolOption = {
  label: string;
  value: string;
  protocol: {
    name: string;
    slug: string;
    symbol: string | null;
    category: string | null;
    tvl: number | null;
    logo: string | null;
    parentProtocol: string | null;
    childProtocols: Array<{
      name: string;
      slug: string;
      category: string | null;
      tvl: number | null;
    }>;
  };
};

type DashboardView = "sites" | "create" | "site" | "domains";
type CreateStep = "protocol" | "basics" | "links" | "domain" | "deploy";
type SitePanel = "overview" | "fields" | "links" | "sources" | "modules" | "domains" | "deploy";

type DomainRow = {
  domain: AnalyticsSiteDomain;
  site: AnalyticsSite;
};

const moduleLabels: Record<keyof AnalyticsSite["enabledModules"], string> = {
  overview: "Overview",
  performance: "Performance chart",
  chains: "Chain distribution",
  economics: "Protocol economics",
  yields: "Yields",
  methodology: "Methodology",
};

const createSteps: Array<{ id: CreateStep; label: string; description: string }> = [
  { id: "protocol", label: "Protocol", description: "Choose a protocol or ecosystem." },
  { id: "basics", label: "Basics", description: "Name, description, and branding." },
  { id: "links", label: "Links", description: "Website and social links." },
  { id: "domain", label: "Domain", description: "Attach and verify DNS." },
  { id: "deploy", label: "Deploy", description: "Publish after DNS is active." },
];

const sitePanels: Array<{ id: SitePanel; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Status, domain, and preview." },
  { id: "fields", label: "Fields", description: "Name, description, logo, colors." },
  { id: "links", label: "Links", description: "Website and X links." },
  { id: "sources", label: "Data Sources", description: "DefiLlama source groups." },
  { id: "modules", label: "Modules", description: "Visible dashboard sections." },
  { id: "domains", label: "Domains", description: "Hostnames and DNS." },
  { id: "deploy", label: "Deploy", description: "Capability checks and publish." },
];

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    minHeight: 42,
    borderColor: "var(--border)",
    borderRadius: 14,
    boxShadow: "none",
    background: "var(--surface-muted)",
    ":hover": { borderColor: "var(--border-strong)" },
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    border: "1px solid var(--border)",
    borderRadius: 14,
    background: "var(--surface)",
    boxShadow: "0 16px 50px rgb(17 17 17 / 0.08)",
    overflow: "hidden",
  }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    background: state.isSelected
      ? "var(--text)"
      : state.isFocused
        ? "var(--surface-muted)"
        : "var(--surface)",
    color: state.isSelected ? "var(--surface)" : "var(--text)",
    fontSize: 14,
  }),
  placeholder: (base: Record<string, unknown>) => ({ ...base, color: "var(--muted)" }),
  multiValue: (base: Record<string, unknown>) => ({ ...base, borderRadius: 999 }),
};

const shellClass =
  "lk-dashboard mx-auto w-[min(1160px,calc(100vw-40px))] pb-14 max-[760px]:w-[min(1160px,calc(100vw-24px))] max-[640px]:w-[min(1160px,calc(100vw-20px))]";
const topbarClass =
  "flex items-center justify-between gap-[18px] py-[22px] max-[640px]:gap-2 max-[640px]:py-3";
const brandClass = "inline-flex items-center gap-2.5 text-[15px] font-bold";
const brandMarkClass =
  "grid size-[30px] place-items-center rounded-full border border-[var(--border)] bg-[var(--text)] text-xs text-[var(--surface)]";
const pillClass =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-[11px] py-[7px] text-xs leading-none text-[var(--muted)]";
const cardClass = "lk-dashboard-card min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)]";
const subtleCardClass = "rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)]";
const eyebrowClass = "text-[13px] font-semibold text-[var(--muted)]";
const buttonClass =
  "lk-action-button inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-[var(--text)] bg-[var(--text)] px-[18px] text-sm font-bold text-[var(--surface)] disabled:pointer-events-none disabled:opacity-60";
const secondaryButtonClass =
  "lk-action-button inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-[18px] text-sm font-bold text-[var(--text)] disabled:pointer-events-none disabled:opacity-60";
const inputClass = `${pillClass} w-full justify-start rounded-xl text-left`;
const fieldLabelClass = "grid gap-[5px] text-[13px] text-[var(--muted)]";

export default function SiteBuilder({ user }: { user: User }) {
  const [sites, setAnalyticsSites] = useState<AnalyticsSite[]>([]);
  const [domainsBySite, setDomainsBySite] = useState<Record<string, AnalyticsSiteDomain[]>>({});
  const [selectedSlug, setSelectedSlug] = useState("");
  const [view, setView] = useState<DashboardView>("sites");
  const [createStep, setCreateStep] = useState<CreateStep>("protocol");
  const [sitePanel, setSitePanel] = useState<SitePanel>("overview");
  const [search, setSearch] = useState("");
  const [protocolOptions, setProtocolOptions] = useState<ProtocolOption[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [lastDomainCheck, setLastDomainCheck] = useState<string | null>(null);
  const [replaceDomain, setReplaceDomain] = useState<DomainRow | null>(null);

  const selectedAnalyticsSite = useMemo(
    () => sites.find((site) => site.slug === selectedSlug),
    [selectedSlug, sites],
  );
  const selectedDomains = selectedAnalyticsSite ? domainsBySite[selectedAnalyticsSite.slug] ?? [] : [];
  const allDomainRows = useMemo(
    () =>
      sites.flatMap((site) =>
        (domainsBySite[site.slug] ?? []).map((domain) => ({
          site,
          domain,
        })),
      ),
    [domainsBySite, sites],
  );
  const profileInitial = (user.name || user.email).slice(0, 1).toUpperCase();

  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login?next=/dashboard";
      throw new Error(payload.error ?? `Request failed with ${response.status}`);
    }
    return payload;
  }

  async function withPending<T>(action: string, task: () => Promise<T>) {
    setPendingAction(action);
    try {
      return await task();
    } finally {
      setPendingAction((current) => (current === action ? null : current));
    }
  }

  async function refreshSites() {
    const payload = await api("/api/sites");
    const nextSites = (payload.sites ?? []) as AnalyticsSite[];
    setAnalyticsSites(nextSites);
    if (nextSites.length === 0) {
      setView("sites");
      setSelectedSlug("");
      return nextSites;
    }
    setSelectedSlug((slug) => slug || nextSites[0].slug);
    return nextSites;
  }

  async function loadDomainsForSite(site: AnalyticsSite) {
    const payload = await api(`/api/sites/${site.slug}/domains`);
    const domains = (payload.domains ?? []) as AnalyticsSiteDomain[];
    setDomainsBySite((items) => ({ ...items, [site.slug]: domains }));
    return domains;
  }

  async function loadDomainsForSites(nextSites = sites) {
    const entries = await Promise.all(
      nextSites.map(async (site) => [site.slug, await loadDomainsForSite(site)] as const),
    );
    setDomainsBySite((items) => ({ ...items, ...Object.fromEntries(entries) }));
  }

  useEffect(() => {
    void refreshSites()
      .then((nextSites) => loadDomainsForSites(nextSites))
      .catch((error) => toast.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (search.trim().length < 2) {
      setProtocolOptions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void api(`/api/sites/protocol-search?q=${encodeURIComponent(search)}`)
        .then((payload) => {
          setProtocolOptions(
            payload.results.map((protocol: ProtocolOption["protocol"]) => ({
              label: protocol.parentProtocol
                ? `${protocol.name} (${protocol.childProtocols.length} protocols)`
                : `${protocol.name} (${protocol.slug})`,
              value: protocol.slug,
              protocol,
            })),
          );
        })
        .catch((error) => toast.error(error.message));
    }, 250);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const activeSite =
      view === "site" && sitePanel === "domains" && selectedAnalyticsSite
        ? selectedAnalyticsSite
        : view === "create" && selectedAnalyticsSite
          ? selectedAnalyticsSite
          : null;
    const candidates =
      view === "domains"
        ? allDomainRows
        : activeSite
          ? (domainsBySite[activeSite.slug] ?? []).map((domain) => ({ site: activeSite, domain }))
          : [];
    const verifying = candidates.filter((row) => row.domain.status !== "active");
    if (verifying.length === 0) return;

    let attempts = 0;
    const refresh = () => {
      for (const row of verifying) {
        void refreshDomainStatus(row.site, row.domain.hostname, { silent: true });
      }
    };
    refresh();
    const interval = window.setInterval(() => {
      attempts += 1;
      if (attempts > 18) {
        window.clearInterval(interval);
        return;
      }
      refresh();
    }, 10000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, sitePanel, selectedSlug, allDomainRows.length]);

  function upsertAnalyticsSite(site: AnalyticsSite) {
    setAnalyticsSites((items) => {
      const exists = items.some((item) => item.slug === site.slug);
      return exists
        ? items.map((item) => (item.slug === site.slug ? site : item))
        : [...items, site];
    });
    setSelectedSlug(site.slug);
  }

  function showSites() {
    setView("sites");
    setProfileOpen(false);
  }

  function startCreateSite() {
    setView("create");
    setCreateStep("protocol");
    setSelectedSlug("");
    setSearch("");
    setProfileOpen(false);
  }

  function openSite(site: AnalyticsSite, panel: SitePanel = "overview") {
    setSelectedSlug(site.slug);
    setSitePanel(panel);
    setView("site");
    setProfileOpen(false);
    void loadDomainsForSite(site);
  }

  function showDomains() {
    setView("domains");
    setProfileOpen(false);
    void loadDomainsForSites();
  }

  async function createFromProtocol(option: ProtocolOption | null) {
    if (!option) return;
    await withPending("create-site", async () => {
      const now = new Date().toISOString();
      const childProtocols = option.protocol.childProtocols.length
        ? option.protocol.childProtocols.map((protocol) => protocol.slug)
        : [option.value];
      const dexProtocols = option.protocol.childProtocols
        .filter((protocol) => protocol.category?.toLowerCase() === "dexs")
        .map((protocol) => protocol.slug);
      const optionProtocols = option.protocol.childProtocols
        .filter((protocol) => protocol.category?.toLowerCase() === "options")
        .map((protocol) => protocol.slug);
      const site: AnalyticsSite = {
        id: `site-${option.value}`,
        ownerUserId: null,
        slug: option.value,
        displayName: option.protocol.name,
        protocolDescription: `${option.protocol.name} analytics portal powered by DefiLlama public APIs.`,
        logoUrl: option.protocol.logo,
        websiteUrl: null,
        twitterUrl: null,
        primaryColor: "#2172e5",
        accentColor: "#16885f",
        backgroundStyle: "light",
        metricSources: {
          tvlProtocol: childProtocols[0] ?? option.value,
          tvlProtocols: childProtocols,
          feesProtocol: childProtocols[0] ?? option.value,
          feesProtocols: childProtocols,
          dexProtocol: dexProtocols[0] ?? childProtocols[0] ?? null,
          dexProtocols,
          optionsProtocol: optionProtocols[0] ?? null,
          optionsProtocols: optionProtocols,
          yieldProjects: childProtocols,
          priceId: option.protocol.symbol ? `coingecko:${option.value}` : null,
          stablecoinAssetId: null,
          parentProtocol: option.protocol.parentProtocol,
          childProtocols,
        },
        capabilities: EMPTY_CAPABILITIES,
        enabledModules: {
          overview: true,
          performance: true,
          chains: true,
          economics: true,
          yields: true,
          methodology: true,
        },
        published: false,
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const payload = await api("/api/sites", {
        method: "POST",
        body: JSON.stringify(site),
      });
      upsertAnalyticsSite(payload.site);
      setCreateStep("basics");
      setView("create");
      toast.success("Analytics site created");
    });
  }

  async function saveSitePatch(site: AnalyticsSite, patch: Partial<AnalyticsSite>, next?: () => void) {
    await withPending("save-site", async () => {
      const payload = await api(`/api/sites/${site.slug}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      upsertAnalyticsSite(payload.site);
      next?.();
      toast.success("Analytics site saved");
    });
  }

  async function saveFields(event: FormEvent<HTMLFormElement>, site: AnalyticsSite, next?: () => void) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveSitePatch(
      site,
      {
        displayName: String(form.get("displayName") ?? site.displayName),
        protocolDescription: String(form.get("protocolDescription") ?? ""),
        logoUrl: String(form.get("logoUrl") ?? "") || null,
        primaryColor: String(form.get("primaryColor") ?? site.primaryColor),
        accentColor: String(form.get("accentColor") ?? site.accentColor),
      },
      next,
    );
  }

  async function saveLinks(event: FormEvent<HTMLFormElement>, site: AnalyticsSite, next?: () => void) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveSitePatch(
      site,
      {
        websiteUrl: String(form.get("websiteUrl") ?? "") || null,
        twitterUrl: String(form.get("twitterUrl") ?? "") || null,
      },
      next,
    );
  }

  async function saveSources(event: FormEvent<HTMLFormElement>, site: AnalyticsSite) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveSitePatch(site, {
      metricSources: {
        tvlProtocol: parseSlugs(String(form.get("tvlProtocols") ?? ""))[0] ?? site.metricSources.tvlProtocol,
        tvlProtocols: parseSlugs(String(form.get("tvlProtocols") ?? "")),
        feesProtocol: parseSlugs(String(form.get("feesProtocols") ?? ""))[0] ?? null,
        feesProtocols: parseSlugs(String(form.get("feesProtocols") ?? "")),
        dexProtocol: parseSlugs(String(form.get("dexProtocols") ?? ""))[0] ?? null,
        dexProtocols: parseSlugs(String(form.get("dexProtocols") ?? "")),
        optionsProtocol: parseSlugs(String(form.get("optionsProtocols") ?? ""))[0] ?? null,
        optionsProtocols: parseSlugs(String(form.get("optionsProtocols") ?? "")),
        yieldProjects: parseSlugs(String(form.get("yieldProjects") ?? "")),
        priceId: String(form.get("priceId") ?? "") || null,
        stablecoinAssetId: String(form.get("stablecoinAssetId") ?? "") || null,
        parentProtocol: String(form.get("parentProtocol") ?? "") || null,
        childProtocols: parseSlugs(String(form.get("childProtocols") ?? "")),
      },
    });
  }

  async function saveModules(event: FormEvent<HTMLFormElement>, site: AnalyticsSite) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveSitePatch(site, {
      enabledModules: Object.fromEntries(
        Object.keys(site.enabledModules).map((key) => [key, form.get(`module-${key}`) === "on"]),
      ) as AnalyticsSite["enabledModules"],
    });
  }

  async function detectCapabilities(site: AnalyticsSite) {
    await withPending("detect", async () => {
      const payload = await api(`/api/sites/${site.slug}/detect-capabilities`, {
        method: "POST",
      });
      upsertAnalyticsSite({ ...site, capabilities: payload.capabilities as ProtocolCapabilities });
      toast.success("Capabilities refreshed");
    });
  }

  async function publishAnalyticsSite(site: AnalyticsSite) {
    await withPending("publish", async () => {
      const payload = await api(`/api/sites/${site.slug}/publish`, {
        method: "POST",
      });
      upsertAnalyticsSite(payload.site);
      toast.success("Analytics site published");
    });
  }

  async function saveDraft(site: AnalyticsSite) {
    await withPending("draft", async () => {
      const payload = await api(`/api/sites/${site.slug}/draft`, {
        method: "POST",
      });
      upsertAnalyticsSite(payload.site);
      toast.success("Saved as draft");
    });
  }

  async function addDomain(event: FormEvent<HTMLFormElement>, site: AnalyticsSite, next?: () => void) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const hostname = String(form.get("hostname") ?? "");
    await withPending("attach-domain", async () => {
      const payload = await api(`/api/sites/${site.slug}/domains`, {
        method: "POST",
        body: JSON.stringify({ hostname }),
      });
      setDomainsBySite((items) => ({
        ...items,
        [site.slug]: upsertDomain(items[site.slug] ?? [], payload.domain),
      }));
      setLastDomainCheck(new Date().toISOString());
      toast.success(`Domain ${payload.domain.hostname} added`);
      event.currentTarget.reset();
      next?.();
    });
  }

  async function refreshDomainStatus(site: AnalyticsSite, hostname: string, options: { silent?: boolean } = {}) {
    await withPending(options.silent ? "auto-refresh-domain" : `refresh-domain:${hostname}`, async () => {
      const payload = await api(`/api/sites/${site.slug}/domains/${encodeURIComponent(hostname)}/status`);
      setDomainsBySite((items) => ({
        ...items,
        [site.slug]: upsertDomain(items[site.slug] ?? [], payload.domain),
      }));
      setLastDomainCheck(new Date().toISOString());
      if (!options.silent) {
        toast.success(payload.domain.status === "active" ? "Domain is active" : "Verification refreshed");
      }
    });
  }

  async function deleteDomain(row: DomainRow) {
    if (!window.confirm(`Delete ${row.domain.hostname} from ${row.site.displayName}?`)) return;
    await withPending(`delete-domain:${row.domain.hostname}`, async () => {
      await api(`/api/sites/${row.site.slug}/domains/${encodeURIComponent(row.domain.hostname)}`, {
        method: "DELETE",
      });
      setDomainsBySite((items) => ({
        ...items,
        [row.site.slug]: (items[row.site.slug] ?? []).filter(
          (domain) => domain.hostname !== row.domain.hostname,
        ),
      }));
      toast.success("Domain deleted");
    });
  }

  async function replaceDomainSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!replaceDomain) return;
    await addDomain(event, replaceDomain.site, () => setReplaceDomain(null));
  }

  async function logout() {
    await withPending("logout", async () => {
      await api("/api/auth/logout", { method: "POST" }).catch(() => null);
      window.location.href = "/login";
    });
  }

  return (
    <main className={shellClass}>
      <nav className={topbarClass}>
        <button className={`${brandClass} border-0 bg-transparent p-0`} onClick={showSites} type="button">
          <span className={brandMarkClass}>DL</span>
          <span className="max-[420px]:hidden">LlamaKit</span>
        </button>
        <div className="relative flex min-w-0 flex-wrap items-center justify-end gap-2.5 max-[640px]:gap-2">
          <ThemeToggle />
          <ActionButton className={`${buttonClass} max-[420px]:px-3`} onClick={startCreateSite} testId="create-site-button">
            Create site
          </ActionButton>
          <button
            aria-expanded={profileOpen}
            className="lk-profile-button inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-1.5 pr-3 text-sm font-bold text-[var(--text)] max-[640px]:pr-1.5"
            data-testid="profile-menu-button"
            onClick={() => setProfileOpen((open) => !open)}
            type="button"
          >
            <span className="grid size-8 place-items-center rounded-full bg-[var(--text)] text-xs text-[var(--surface)]">
              {profileInitial}
            </span>
            <span className="max-w-[160px] truncate max-[640px]:hidden">{user.name || user.email}</span>
          </button>
          {profileOpen ? (
            <ProfileMenu
              loading={pendingAction}
              onLogout={() => void logout()}
              onManageDomains={showDomains}
              onManageSites={showSites}
              user={user}
            />
          ) : null}
        </div>
      </nav>

      <section className="lk-step-content grid gap-5" key={`${view}-${sitePanel}-${createStep}`}>
        {view === "sites" ? (
          <ManageSitesView
            domainsBySite={domainsBySite}
            onCreate={startCreateSite}
            onOpenSite={openSite}
            sites={sites}
          />
        ) : null}

        {view === "create" ? (
          <CreateSiteView
            createStep={createStep}
            domains={selectedDomains}
            isBusy={pendingAction}
            lastDomainCheck={lastDomainCheck}
            onAddDomain={(event) => selectedAnalyticsSite ? void addDomain(event, selectedAnalyticsSite) : undefined}
            onBackToSites={showSites}
            onCreateFromProtocol={createFromProtocol}
            onDetect={() => selectedAnalyticsSite ? void detectCapabilities(selectedAnalyticsSite) : undefined}
            onOpenDomains={() => setCreateStep("domain")}
            onPublish={() => selectedAnalyticsSite ? void publishAnalyticsSite(selectedAnalyticsSite) : undefined}
            onRefreshDomain={(domain) =>
              selectedAnalyticsSite
                ? void refreshDomainStatus(selectedAnalyticsSite, domain.hostname)
                : undefined
            }
            onSaveDraft={() => selectedAnalyticsSite ? void saveDraft(selectedAnalyticsSite) : undefined}
            onSaveFields={(event) =>
              selectedAnalyticsSite
                ? void saveFields(event, selectedAnalyticsSite, () => setCreateStep("links"))
                : undefined
            }
            onSaveLinks={(event) =>
              selectedAnalyticsSite
                ? void saveLinks(event, selectedAnalyticsSite, () => setCreateStep("domain"))
                : undefined
            }
            onSkipDomain={() => setCreateStep("deploy")}
            onStepChange={setCreateStep}
            protocolOptions={protocolOptions}
            search={search}
            setSearch={setSearch}
            site={selectedAnalyticsSite}
          />
        ) : null}

        {view === "site" && selectedAnalyticsSite ? (
          <SiteWorkspace
            domains={selectedDomains}
            isBusy={pendingAction}
            lastDomainCheck={lastDomainCheck}
            onAddDomain={(event) => void addDomain(event, selectedAnalyticsSite)}
            onDeleteDomain={(domain) => void deleteDomain({ site: selectedAnalyticsSite, domain })}
            onDetect={() => void detectCapabilities(selectedAnalyticsSite)}
            onOpenPanel={setSitePanel}
            onPublish={() => void publishAnalyticsSite(selectedAnalyticsSite)}
            onRefreshDomain={(domain) => void refreshDomainStatus(selectedAnalyticsSite, domain.hostname)}
            onReplaceDomain={(domain) => setReplaceDomain({ site: selectedAnalyticsSite, domain })}
            onSaveDraft={() => void saveDraft(selectedAnalyticsSite)}
            onSaveFields={(event) => void saveFields(event, selectedAnalyticsSite)}
            onSaveLinks={(event) => void saveLinks(event, selectedAnalyticsSite)}
            onSaveModules={(event) => void saveModules(event, selectedAnalyticsSite)}
            onSaveSources={(event) => void saveSources(event, selectedAnalyticsSite)}
            panel={sitePanel}
            site={selectedAnalyticsSite}
          />
        ) : null}

        {view === "domains" ? (
          <ManageDomainsView
            isBusy={pendingAction}
            lastDomainCheck={lastDomainCheck}
            onCreate={startCreateSite}
            onDelete={deleteDomain}
            onOpenSite={(site) => openSite(site, "domains")}
            onRefresh={(row) => void refreshDomainStatus(row.site, row.domain.hostname)}
            onReplace={setReplaceDomain}
            rows={allDomainRows}
          />
        ) : null}
      </section>

      {replaceDomain ? (
        <ReplaceDomainModal
          isBusy={pendingAction === "attach-domain"}
          onClose={() => setReplaceDomain(null)}
          onSubmit={replaceDomainSubmit}
          row={replaceDomain}
        />
      ) : null}
    </main>
  );
}

function ManageSitesView({
  domainsBySite,
  onCreate,
  onOpenSite,
  sites,
}: {
  domainsBySite: Record<string, AnalyticsSiteDomain[]>;
  onCreate: () => void;
  onOpenSite: (site: AnalyticsSite) => void;
  sites: AnalyticsSite[];
}) {
  return (
    <>
      <DashboardHero
        eyebrow="Manage sites"
        title="Analytics sites"
        copy="Every branded dashboard you own, with publish state, domain health, and quick access."
        action={<ActionButton className={buttonClass} onClick={onCreate}>Create site</ActionButton>}
      />

      {sites.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5 max-[640px]:gap-2.5">
          {sites.map((site) => {
            const domains = domainsBySite[site.slug] ?? [];
            const activeDomain = domains.find((domain) => domain.status === "active");
            return (
              <button
                className={`${cardClass} lk-site-card grid gap-4 p-5 text-left max-[640px]:gap-3 max-[640px]:p-4`}
                key={site.slug}
                onClick={() => onOpenSite(site)}
                type="button"
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="flex min-w-0 items-center gap-3">
                    <SiteLogo site={site} />
                    <span className="min-w-0">
                      <strong className="block truncate text-lg">{site.displayName}</strong>
                      <span className="block truncate text-sm text-[var(--muted)]">/sites/{site.slug}</span>
                    </span>
                  </span>
                  <StatusPill status={site.published ? "live" : "draft"} tone={site.published ? "good" : "muted"} />
                </span>
                <span className="grid grid-cols-2 gap-2 text-sm max-[640px]:grid-cols-1">
                  <MetricLine label="Domain" value={activeDomain?.hostname ?? "No active domain"} />
                  <MetricLine label="Updated" value={formatDate(site.updatedAt)} />
                </span>
                <span className="flex flex-wrap gap-2 max-[640px]:[&>*]:flex-1">
                  <a
                    className={secondaryButtonClass}
                    href={`/sites/${site.slug}`}
                    onClick={(event) => event.stopPropagation()}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Preview
                  </a>
                  <span className={pillClass}>
                    {domains.length ? `${domains.length} domain${domains.length === 1 ? "" : "s"}` : "no domains"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          action="Create analytics site"
          copy="Start by choosing a DefiLlama protocol, then attach a domain before publishing."
          onAction={onCreate}
          title="No analytics sites yet"
        />
      )}
    </>
  );
}

function CreateSiteView({
  createStep,
  domains,
  isBusy,
  lastDomainCheck,
  onAddDomain,
  onBackToSites,
  onCreateFromProtocol,
  onDetect,
  onOpenDomains,
  onPublish,
  onRefreshDomain,
  onSaveDraft,
  onSaveFields,
  onSaveLinks,
  onSkipDomain,
  onStepChange,
  protocolOptions,
  search,
  setSearch,
  site,
}: {
  createStep: CreateStep;
  domains: AnalyticsSiteDomain[];
  isBusy: string | null;
  lastDomainCheck: string | null;
  onAddDomain: (event: FormEvent<HTMLFormElement>) => void | undefined;
  onBackToSites: () => void;
  onCreateFromProtocol: (option: ProtocolOption | null) => void;
  onDetect: () => void | undefined;
  onOpenDomains: () => void;
  onPublish: () => void | undefined;
  onRefreshDomain: (domain: AnalyticsSiteDomain) => void | undefined;
  onSaveDraft: () => void | undefined;
  onSaveFields: (event: FormEvent<HTMLFormElement>) => void | undefined;
  onSaveLinks: (event: FormEvent<HTMLFormElement>) => void | undefined;
  onSkipDomain: () => void;
  onStepChange: (step: CreateStep) => void;
  protocolOptions: ProtocolOption[];
  search: string;
  setSearch: (value: string) => void;
  site: AnalyticsSite | undefined;
}) {
  const activeDomain = domains.find((domain) => domain.status === "active");
  const currentIndex = createSteps.findIndex((step) => step.id === createStep);
  const maxIndex = site ? (activeDomain ? 4 : createStep === "protocol" ? 0 : 4) : 0;

  return (
    <section className="grid grid-cols-12 gap-3.5 max-[1180px]:grid-cols-1">
      <aside className={`${cardClass} col-span-3 self-start p-4 max-[1180px]:col-span-1 max-[760px]:sticky max-[760px]:top-0 max-[760px]:z-10 max-[760px]:p-2`}>
        <p className={`${eyebrowClass} m-0 max-[760px]:sr-only`}>Create site</p>
        <StepNav
          activeIndex={currentIndex}
          items={createSteps}
          maxIndex={maxIndex}
          onSelect={(step) => onStepChange(step.id as CreateStep)}
        />
      </aside>
      <div className={`${cardClass} col-span-9 overflow-hidden max-[1180px]:col-span-1`}>
        <div className="lk-step-content grid gap-5 p-7 max-[760px]:p-5 max-[640px]:p-4" key={createStep}>
          {createStep === "protocol" ? (
            <ProtocolStep
              isBusy={isBusy === "create-site"}
              onCreateFromProtocol={onCreateFromProtocol}
              protocolOptions={protocolOptions}
              search={search}
              setSearch={setSearch}
            />
          ) : null}

          {createStep === "basics" && site ? (
            <FieldsPanel
              isBusy={isBusy === "save-site"}
              onSubmit={onSaveFields}
              site={site}
              submitLabel="Save and continue"
            />
          ) : null}

          {createStep === "links" && site ? (
            <LinksPanel
              isBusy={isBusy === "save-site"}
              onSubmit={onSaveLinks}
              site={site}
              submitLabel="Save and continue"
            />
          ) : null}

          {createStep === "domain" && site ? (
            <DomainsPanel
              domains={domains}
              isBusy={isBusy}
              lastDomainCheck={lastDomainCheck}
              onAddDomain={onAddDomain}
              onDeleteDomain={() => undefined}
              onRefreshDomain={onRefreshDomain}
              onReplaceDomain={() => undefined}
              showManagementActions={false}
              site={site}
            >
              <div className="flex flex-wrap gap-2.5 max-[640px]:[&>*]:w-full">
                <ActionButton className={secondaryButtonClass} onClick={onSkipDomain}>
                  Save draft without domain
                </ActionButton>
                <ActionButton className={buttonClass} disabled={!activeDomain} onClick={() => onStepChange("deploy")}>
                  Continue to deploy
                </ActionButton>
              </div>
            </DomainsPanel>
          ) : null}

          {createStep === "deploy" && site ? (
            <DeployPanel
              activeDomain={activeDomain}
              domains={domains}
              isBusy={isBusy}
              onDetect={onDetect}
              onOpenDomains={onOpenDomains}
              onPublish={onPublish}
              onSaveDraft={onSaveDraft}
              site={site}
            />
          ) : null}

          <button className="w-fit text-sm font-bold text-[var(--muted)]" onClick={onBackToSites} type="button">
            Back to sites
          </button>
        </div>
      </div>
    </section>
  );
}

function SiteWorkspace({
  domains,
  isBusy,
  lastDomainCheck,
  onAddDomain,
  onDeleteDomain,
  onDetect,
  onOpenPanel,
  onPublish,
  onRefreshDomain,
  onReplaceDomain,
  onSaveDraft,
  onSaveFields,
  onSaveLinks,
  onSaveModules,
  onSaveSources,
  panel,
  site,
}: {
  domains: AnalyticsSiteDomain[];
  isBusy: string | null;
  lastDomainCheck: string | null;
  onAddDomain: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteDomain: (domain: AnalyticsSiteDomain) => void;
  onDetect: () => void;
  onOpenPanel: (panel: SitePanel) => void;
  onPublish: () => void;
  onRefreshDomain: (domain: AnalyticsSiteDomain) => void;
  onReplaceDomain: (domain: AnalyticsSiteDomain) => void;
  onSaveDraft: () => void;
  onSaveFields: (event: FormEvent<HTMLFormElement>) => void;
  onSaveLinks: (event: FormEvent<HTMLFormElement>) => void;
  onSaveModules: (event: FormEvent<HTMLFormElement>) => void;
  onSaveSources: (event: FormEvent<HTMLFormElement>) => void;
  panel: SitePanel;
  site: AnalyticsSite;
}) {
  const activeDomain = domains.find((domain) => domain.status === "active");

  return (
    <section className="grid gap-3.5">
      <div className={`${cardClass} grid gap-4 p-5 max-[640px]:p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 max-[640px]:w-full">
            <SiteLogo site={site} />
            <div className="min-w-0">
              <p className={`${eyebrowClass} m-0`}>Site workspace</p>
              <h1 className="m-0 mt-1 truncate text-[clamp(30px,4vw,44px)] leading-none">{site.displayName}</h1>
              <p className="m-0 mt-2 truncate text-sm text-[var(--muted)]">/sites/{site.slug}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 max-[640px]:w-full max-[640px]:justify-start max-[640px]:[&>*]:flex-1">
            <StatusPill status={site.published ? "live" : "draft"} tone={site.published ? "good" : "muted"} />
            <StatusPill status={activeDomain?.hostname ?? "no active domain"} tone={activeDomain ? "good" : "warn"} />
            <a className={secondaryButtonClass} href={`/sites/${site.slug}`} rel="noreferrer" target="_blank">
              Preview
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3.5 max-[1180px]:grid-cols-1">
        <aside className={`${cardClass} col-span-3 self-start p-3 max-[1180px]:col-span-1 max-[1180px]:sticky max-[1180px]:top-0 max-[1180px]:z-10 max-[1180px]:p-2`}>
          <nav className="grid gap-1 max-[1180px]:flex max-[1180px]:overflow-x-auto max-[1180px]:pb-1">
            {sitePanels.map((item) => (
              <button
                className={`lk-menu-item max-[1180px]:min-w-fit max-[1180px]:justify-center max-[1180px]:whitespace-nowrap ${panel === item.id ? "bg-[var(--surface-muted)] max-[1180px]:border-[var(--text)]" : ""}`}
                key={item.id}
                onClick={() => onOpenPanel(item.id)}
                type="button"
              >
                <span>
                  <span className="block font-bold">{item.label}</span>
                  <span className="block text-xs text-[var(--muted)] max-[760px]:hidden">{item.description}</span>
                </span>
              </button>
            ))}
          </nav>
        </aside>
        <div className={`${cardClass} col-span-9 overflow-hidden max-[1180px]:col-span-1`}>
          <div className="lk-step-content grid gap-5 p-7 max-[760px]:p-5 max-[640px]:p-4" key={panel}>
            {panel === "overview" ? (
              <OverviewPanel
                activeDomain={activeDomain}
                domains={domains}
                onOpenPanel={onOpenPanel}
                site={site}
              />
            ) : null}
            {panel === "fields" ? (
              <FieldsPanel isBusy={isBusy === "save-site"} onSubmit={onSaveFields} site={site} submitLabel="Save fields" />
            ) : null}
            {panel === "links" ? (
              <LinksPanel isBusy={isBusy === "save-site"} onSubmit={onSaveLinks} site={site} submitLabel="Save links" />
            ) : null}
            {panel === "sources" ? (
              <SourcesPanel isBusy={isBusy === "save-site"} onSubmit={onSaveSources} site={site} />
            ) : null}
            {panel === "modules" ? (
              <ModulesPanel isBusy={isBusy === "save-site"} onSubmit={onSaveModules} site={site} />
            ) : null}
            {panel === "domains" ? (
              <DomainsPanel
                domains={domains}
                isBusy={isBusy}
                lastDomainCheck={lastDomainCheck}
                onAddDomain={onAddDomain}
                onDeleteDomain={onDeleteDomain}
                onRefreshDomain={onRefreshDomain}
                onReplaceDomain={onReplaceDomain}
                site={site}
              />
            ) : null}
            {panel === "deploy" ? (
              <DeployPanel
                activeDomain={activeDomain}
                domains={domains}
                isBusy={isBusy}
                onDetect={onDetect}
                onOpenDomains={() => onOpenPanel("domains")}
                onPublish={onPublish}
                onSaveDraft={onSaveDraft}
                site={site}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function ManageDomainsView({
  isBusy,
  lastDomainCheck,
  onCreate,
  onDelete,
  onOpenSite,
  onRefresh,
  onReplace,
  rows,
}: {
  isBusy: string | null;
  lastDomainCheck: string | null;
  onCreate: () => void;
  onDelete: (row: DomainRow) => void;
  onOpenSite: (site: AnalyticsSite) => void;
  onRefresh: (row: DomainRow) => void;
  onReplace: (row: DomainRow) => void;
  rows: DomainRow[];
}) {
  return (
    <>
      <DashboardHero
        eyebrow="Manage domains"
        title="Domains"
        copy="All customer-facing hostnames attached to your analytics sites."
        action={<ActionButton className={buttonClass} onClick={onCreate}>Create site</ActionButton>}
      />
      {rows.length ? (
        <div className={`${cardClass} overflow-hidden max-[980px]:grid max-[980px]:gap-2.5 max-[980px]:border-0 max-[980px]:bg-transparent max-[980px]:shadow-none`}>
          <div className="grid grid-cols-[1.1fr_1fr_120px_1.1fr_260px] gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs font-bold text-[var(--muted)] max-[980px]:hidden">
            <span>Hostname</span>
            <span>Site</span>
            <span>Status</span>
            <span>DNS</span>
            <span>Actions</span>
          </div>
          {rows.map((row) => (
            <div
              className="lk-record-row grid grid-cols-[1.1fr_1fr_120px_1.1fr_260px] items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0 max-[980px]:grid-cols-1 max-[980px]:rounded-2xl max-[980px]:border max-[980px]:bg-[var(--surface)] max-[980px]:p-4"
              key={row.domain.hostname}
            >
              <span className="grid gap-1">
                <span className="hidden text-xs font-bold text-[var(--muted)] max-[980px]:block">Hostname</span>
                <strong className="break-all">{row.domain.hostname}</strong>
              </span>
              <span className="grid gap-1">
                <span className="hidden text-xs font-bold text-[var(--muted)] max-[980px]:block">Site</span>
                <button className="w-fit text-left font-bold text-[var(--muted)]" onClick={() => onOpenSite(row.site)} type="button">
                  {row.site.displayName}
                </button>
              </span>
              <span className="grid gap-1">
                <span className="hidden text-xs font-bold text-[var(--muted)] max-[980px]:block">Status</span>
                <StatusPill status={row.domain.status} tone={row.domain.status === "active" ? "good" : "warn"} />
              </span>
              <span className="grid min-w-0 gap-1 text-xs text-[var(--muted)]">
                <span className="hidden font-bold text-[var(--muted)] max-[980px]:block">DNS</span>
                <span>
                  {getDnsRecords(row.domain)[0]
                    ? `${getDnsRecords(row.domain)[0].type} ${getDnsRecords(row.domain)[0].name}`
                    : "No DNS record"}
                  {lastDomainCheck ? ` • checked ${formatTime(lastDomainCheck)}` : ""}
                </span>
              </span>
              <span className="flex flex-wrap gap-2 max-[640px]:[&>*]:flex-1">
                <ActionButton
                  className={secondaryButtonClass}
                  loading={isBusy === `refresh-domain:${row.domain.hostname}`}
                  onClick={() => onRefresh(row)}
                >
                  Check
                </ActionButton>
                <ActionButton className={secondaryButtonClass} onClick={() => onReplace(row)}>
                  Replace
                </ActionButton>
                <ActionButton
                  className={`${secondaryButtonClass} max-[980px]:border-[var(--bad)]/40 max-[980px]:text-[var(--bad)]`}
                  loading={isBusy === `delete-domain:${row.domain.hostname}`}
                  onClick={() => onDelete(row)}
                >
                  Delete
                </ActionButton>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          action="Create analytics site"
          copy="Domains appear here after a site attaches a hostname."
          onAction={onCreate}
          title="No domains yet"
        />
      )}
    </>
  );
}

function ProtocolStep({
  isBusy,
  onCreateFromProtocol,
  protocolOptions,
  search,
  setSearch,
}: {
  isBusy: boolean;
  onCreateFromProtocol: (option: ProtocolOption | null) => void;
  protocolOptions: ProtocolOption[];
  search: string;
  setSearch: (value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <PanelHeading
        eyebrow="Step 1"
        title="Select protocol"
        copy="Search DefiLlama protocols or parent ecosystems. Parent protocols prefill source groups with child protocol slugs."
      />
      <Select
        instanceId="protocol-search"
        inputId="protocol-search-input"
        inputValue={search}
        isDisabled={isBusy}
        onChange={(value) => onCreateFromProtocol(value as ProtocolOption | null)}
        onInputChange={(value) => setSearch(value)}
        options={protocolOptions}
        placeholder="Search DefiLlama protocols"
        styles={selectStyles}
      />
      {isBusy ? (
        <p className="m-0 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
          <Spinner /> Creating source groups from DefiLlama registry
        </p>
      ) : null}
    </div>
  );
}

function OverviewPanel({
  activeDomain,
  domains,
  onOpenPanel,
  site,
}: {
  activeDomain: AnalyticsSiteDomain | undefined;
  domains: AnalyticsSiteDomain[];
  onOpenPanel: (panel: SitePanel) => void;
  site: AnalyticsSite;
}) {
  return (
    <div className="grid gap-4">
      <PanelHeading
        eyebrow="Overview"
        title={site.displayName}
        copy="A quick read on publish status, route health, and the next action."
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        <InfoCard label="Publish status" value={site.published ? "Live" : "Draft"} />
        <InfoCard label="Active domain" value={activeDomain?.hostname ?? "Required to deploy"} />
        <InfoCard label="Domains" value={`${domains.length}`} />
        <InfoCard label="Updated" value={formatDate(site.updatedAt)} />
      </div>
      <div className="flex flex-wrap gap-2.5 max-[640px]:[&>*]:flex-1">
        <ActionButton className={buttonClass} onClick={() => onOpenPanel("deploy")}>
          Open deploy panel
        </ActionButton>
        <ActionButton className={secondaryButtonClass} onClick={() => onOpenPanel("domains")}>
          Manage domains
        </ActionButton>
      </div>
    </div>
  );
}

function FieldsPanel({
  isBusy,
  onSubmit,
  site,
  submitLabel,
}: {
  isBusy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  site: AnalyticsSite;
  submitLabel: string;
}) {
  return (
    <form className="grid gap-3.5" onSubmit={onSubmit}>
      <PanelHeading eyebrow="Fields" title="Branding and fields" copy="Control the public identity of this analytics site." />
      <Field name="displayName" label="Display name" value={site.displayName} />
      <TextArea name="protocolDescription" label="Protocol description" value={site.protocolDescription} />
      <Field name="logoUrl" label="Logo URL" value={site.logoUrl ?? ""} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
        <Field name="primaryColor" label="Primary color" type="color" value={site.primaryColor} />
        <Field name="accentColor" label="Accent color" type="color" value={site.accentColor} />
      </div>
      <ActionButton className={buttonClass} loading={isBusy} type="submit">
        {submitLabel}
      </ActionButton>
    </form>
  );
}

function LinksPanel({
  isBusy,
  onSubmit,
  site,
  submitLabel,
}: {
  isBusy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  site: AnalyticsSite;
  submitLabel: string;
}) {
  return (
    <form className="grid gap-3.5" onSubmit={onSubmit}>
      <PanelHeading eyebrow="Links" title="Project links" copy="Show the protocol’s official destinations in the dashboard header." />
      <Field name="websiteUrl" label="Website URL" value={site.websiteUrl ?? ""} />
      <Field name="twitterUrl" label="X URL" value={site.twitterUrl ?? ""} />
      <ActionButton className={buttonClass} loading={isBusy} type="submit">
        {submitLabel}
      </ActionButton>
    </form>
  );
}

function SourcesPanel({
  isBusy,
  onSubmit,
  site,
}: {
  isBusy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  site: AnalyticsSite;
}) {
  return (
    <form className="grid gap-3.5" onSubmit={onSubmit}>
      <PanelHeading eyebrow="Data Sources" title="DefiLlama source groups" copy="Tune which protocols feed each metric family." />
      <TextArea compact name="parentProtocol" label="Parent protocol" value={site.metricSources.parentProtocol ?? ""} />
      <TextArea compact name="childProtocols" label="Selected child protocols" value={(site.metricSources.childProtocols ?? [site.metricSources.tvlProtocol]).join(", ")} />
      <TextArea compact name="tvlProtocols" label="TVL sources" value={(site.metricSources.tvlProtocols ?? [site.metricSources.tvlProtocol]).join(", ")} />
      <TextArea compact name="feesProtocols" label="Fees and revenue sources" value={(site.metricSources.feesProtocols ?? [site.metricSources.feesProtocol].filter(Boolean)).join(", ")} />
      <TextArea compact name="dexProtocols" label="DEX volume sources" value={(site.metricSources.dexProtocols ?? [site.metricSources.dexProtocol].filter(Boolean)).join(", ")} />
      <TextArea compact name="optionsProtocols" label="Options volume sources" value={(site.metricSources.optionsProtocols ?? [site.metricSources.optionsProtocol].filter(Boolean)).join(", ")} />
      <Field name="yieldProjects" label="Yield projects" value={site.metricSources.yieldProjects.join(", ")} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
        <Field name="priceId" label="Price source" value={site.metricSources.priceId ?? ""} />
        <Field name="stablecoinAssetId" label="Stablecoin asset ID" value={site.metricSources.stablecoinAssetId ?? ""} />
      </div>
      <ActionButton className={buttonClass} loading={isBusy} type="submit">
        Save data sources
      </ActionButton>
    </form>
  );
}

function ModulesPanel({
  isBusy,
  onSubmit,
  site,
}: {
  isBusy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  site: AnalyticsSite;
}) {
  return (
    <form className="grid gap-3.5" onSubmit={onSubmit}>
      <PanelHeading eyebrow="Modules" title="Dashboard modules" copy="Choose what appears on the public analytics site." />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-2.5">
        {Object.entries(moduleLabels).map(([key, label]) => (
          <label className={`${subtleCardClass} flex items-center justify-between gap-3 p-3`} key={key}>
            <span className="font-bold">{label}</span>
            <input
              defaultChecked={site.enabledModules[key as keyof AnalyticsSite["enabledModules"]]}
              name={`module-${key}`}
              suppressHydrationWarning
              type="checkbox"
            />
          </label>
        ))}
      </div>
      <ActionButton className={buttonClass} loading={isBusy} type="submit">
        Save modules
      </ActionButton>
    </form>
  );
}

function DomainsPanel({
  children,
  domains,
  isBusy,
  lastDomainCheck,
  onAddDomain,
  onDeleteDomain,
  onRefreshDomain,
  onReplaceDomain,
  showManagementActions = true,
  site,
}: {
  children?: ReactNode;
  domains: AnalyticsSiteDomain[];
  isBusy: string | null;
  lastDomainCheck: string | null;
  onAddDomain: (event: FormEvent<HTMLFormElement>) => void | undefined;
  onDeleteDomain: (domain: AnalyticsSiteDomain) => void;
  onRefreshDomain: (domain: AnalyticsSiteDomain) => void | undefined;
  onReplaceDomain: (domain: AnalyticsSiteDomain) => void;
  showManagementActions?: boolean;
  site: AnalyticsSite;
}) {
  return (
    <div className="grid gap-4">
      <PanelHeading eyebrow="Domains" title="Custom domains" copy="Attach hostnames, copy exact DNS records, and verify routing." />
      <form className="grid max-w-[560px] gap-3" onSubmit={onAddDomain}>
        <input className={inputClass} name="hostname" placeholder="analytics.yourdomain.com" required suppressHydrationWarning />
        <ActionButton className={buttonClass} loading={isBusy === "attach-domain"} type="submit">
          Attach domain
        </ActionButton>
      </form>

      {domains.length ? (
        <div className="grid gap-3">
          {domains.map((domain) => (
            <DomainInstructions
              domain={domain}
              isRefreshing={isBusy === `refresh-domain:${domain.hostname}` || isBusy === "auto-refresh-domain"}
              key={domain.hostname}
              lastCheckedAt={lastDomainCheck}
              onDelete={() => onDeleteDomain(domain)}
              onRefresh={() => onRefreshDomain(domain)}
              onReplace={() => onReplaceDomain(domain)}
              showManagementActions={showManagementActions}
              site={site}
            />
          ))}
        </div>
      ) : (
        <div className={`${subtleCardClass} p-4 text-sm text-[var(--muted)]`}>
          No domains attached yet. Add one before deploying this analytics site.
        </div>
      )}
      {children}
    </div>
  );
}

function DeployPanel({
  activeDomain,
  domains,
  isBusy,
  onDetect,
  onOpenDomains,
  onPublish,
  onSaveDraft,
  site,
}: {
  activeDomain: AnalyticsSiteDomain | undefined;
  domains: AnalyticsSiteDomain[];
  isBusy: string | null;
  onDetect: () => void | undefined;
  onOpenDomains: () => void;
  onPublish: () => void | undefined;
  onSaveDraft: () => void | undefined;
  site: AnalyticsSite;
}) {
  const canDeploy = activeDomain !== undefined;
  return (
    <div className="grid gap-4">
      <PanelHeading eyebrow="Deploy" title="Publish analytics site" copy="A verified custom domain is required before this site can go live." />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
        {Object.entries(site.capabilities).map(([key, enabled]) => (
          <div className={`${pillClass} justify-between`} key={key}>
            <span>{key}</span>
            <span>{enabled ? "yes" : "no"}</span>
          </div>
        ))}
      </div>
      <div className={`${subtleCardClass} grid gap-2 p-4`}>
        <strong>{canDeploy ? "Ready to deploy" : "Verify DNS to deploy"}</strong>
        <p className="m-0 text-sm leading-[1.55] text-[var(--muted)]">
          {activeDomain
            ? `${activeDomain.hostname} is active. Publishing will make this site visible in explorer and public domain routes.`
            : domains.length
              ? "A domain is attached, but none are active yet. Check DNS status from the Domains panel."
              : "Attach and verify a custom domain before publishing."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <ActionButton className={secondaryButtonClass} loading={isBusy === "detect"} onClick={onDetect}>
          Detect capabilities
        </ActionButton>
        <ActionButton className={secondaryButtonClass} onClick={onOpenDomains}>
          Go to domains
        </ActionButton>
        <ActionButton className={secondaryButtonClass} loading={isBusy === "draft"} onClick={onSaveDraft}>
          Save draft
        </ActionButton>
        <ActionButton className={buttonClass} disabled={!canDeploy} loading={isBusy === "publish"} onClick={onPublish}>
          Deploy
        </ActionButton>
      </div>
    </div>
  );
}

function DomainInstructions({
  domain,
  isRefreshing,
  lastCheckedAt,
  onDelete,
  onRefresh,
  onReplace,
  showManagementActions,
}: {
  domain: AnalyticsSiteDomain;
  isRefreshing: boolean;
  lastCheckedAt: string | null;
  onDelete: () => void;
  onRefresh: () => void | undefined;
  onReplace: () => void;
  showManagementActions: boolean;
  site: AnalyticsSite;
}) {
  const records = getDnsRecords(domain);
  const isActive = domain.status === "active";

  return (
    <div className={`${subtleCardClass} grid gap-4 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span aria-hidden="true" className={`lk-dns-radar mt-1 ${isActive ? "is-active" : isRefreshing ? "is-checking" : ""}`} />
          <div>
            <p className={`${eyebrowClass} m-0`}>DNS setup</p>
            <h3 className="mb-0 mt-1 text-xl">{domain.hostname}</h3>
            <p className="mb-0 mt-2 max-w-[720px] text-sm leading-[1.55] text-[var(--muted)]">
              Add these exact records in the customer DNS provider, then check status.
            </p>
            <p className="m-0 mt-2 text-xs text-[var(--soft)]">
              {lastCheckedAt ? `Last checked ${formatTime(lastCheckedAt)}` : "Auto-refresh starts when this panel opens"}
              {!isActive ? " • auto-refreshing every 10s" : ""}
            </p>
          </div>
        </div>
        <StatusPill status={isRefreshing ? "checking" : domain.status} tone={isActive ? "good" : "warn"} />
      </div>

      {records.length ? <DnsRecords records={records} /> : (
        <div className="rounded-xl border border-[var(--bad)]/40 bg-[var(--bad)]/10 p-4 text-sm leading-[1.55] text-[var(--text)]">
          LlamaKit could not read DNS records from Vercel yet. Check status once more before handing this to a customer.
        </div>
      )}

      {domain.verificationData?.error ? (
        <p className="m-0 text-sm text-[var(--bad)]">{String(domain.verificationData.error)}</p>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <ActionButton className={secondaryButtonClass} loading={isRefreshing} onClick={onRefresh}>
          Check status
        </ActionButton>
        {showManagementActions ? (
          <>
            <ActionButton className={secondaryButtonClass} onClick={onReplace}>
              Replace
            </ActionButton>
            <ActionButton className={`${secondaryButtonClass} border-[var(--bad)]/40 text-[var(--bad)]`} onClick={onDelete}>
              Delete
            </ActionButton>
          </>
        ) : null}
      </div>
    </div>
  );
}

function DnsRecords({ records }: { records: DnsRecord[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="grid grid-cols-[110px_minmax(160px,1fr)_minmax(220px,1.3fr)] border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-bold text-[var(--muted)] max-[760px]:hidden">
        <span className="px-3 py-2">Type</span>
        <span className="px-3 py-2">Name / Host</span>
        <span className="px-3 py-2">Value</span>
      </div>
      {records.map((record, index) => (
        <div
          className="lk-record-row grid grid-cols-[110px_minmax(160px,1fr)_minmax(220px,1.3fr)] border-b border-[var(--border)] text-sm last:border-b-0 max-[760px]:grid-cols-1"
          key={`${record.type}-${record.name}-${record.value}-${index}`}
        >
          <span className="px-3 py-2 font-bold uppercase max-[760px]:pb-0">
            <span className="hidden text-xs normal-case text-[var(--muted)] max-[760px]:mb-1 max-[760px]:block">Type</span>
            {record.type}
          </span>
          <code className="break-all px-3 py-2 text-[13px] text-[var(--text)]">
            <span className="hidden font-sans text-xs text-[var(--muted)] max-[760px]:mb-1 max-[760px]:block">Name / Host</span>
            {record.name}
          </code>
          <code className="break-all px-3 py-2 text-[13px] text-[var(--text)]">
            <span className="hidden font-sans text-xs text-[var(--muted)] max-[760px]:mb-1 max-[760px]:block">Value</span>
            {record.value}
          </code>
          {record.reason ? (
            <p className="col-span-3 m-0 border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] max-[760px]:col-span-1">
              {record.reason}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ProfileMenu({
  loading,
  onLogout,
  onManageDomains,
  onManageSites,
  user,
}: {
  loading: string | null;
  onLogout: () => void;
  onManageDomains: () => void;
  onManageSites: () => void;
  user: User;
}) {
  return (
    <div className="lk-profile-menu absolute right-0 top-[calc(100%+10px)] z-20 grid w-[300px] gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2.5 max-[640px]:fixed max-[640px]:left-2.5 max-[640px]:right-2.5 max-[640px]:top-[62px] max-[640px]:w-auto">
      <div className="rounded-xl bg-[var(--surface-muted)] p-3">
        <p className="m-0 text-xs font-bold text-[var(--muted)]">Signed in as</p>
        <p className="m-0 mt-1 truncate text-sm font-bold">{user.name || user.email}</p>
        <p className="m-0 truncate text-xs text-[var(--muted)]">{user.email}</p>
      </div>
      <button className="lk-menu-item" onClick={onManageSites} type="button">
        <span>Manage sites</span>
      </button>
      <button className="lk-menu-item" onClick={onManageDomains} type="button">
        <span>Manage domains</span>
      </button>
      <button className="lk-menu-item text-[var(--bad)]" disabled={loading === "logout"} onClick={onLogout} type="button">
        <span>Logout</span>
        {loading === "logout" ? <Spinner /> : null}
      </button>
    </div>
  );
}

function ReplaceDomainModal({
  isBusy,
  onClose,
  onSubmit,
  row,
}: {
  isBusy: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  row: DomainRow;
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4">
      <div className={`${cardClass} grid w-[min(520px,100%)] gap-4 p-5`}>
        <PanelHeading
          eyebrow="Replace domain"
          title={row.domain.hostname}
          copy="Attach the new hostname first. Delete the old hostname after the replacement is verified."
        />
        <form className="grid gap-3" onSubmit={onSubmit}>
          <input className={inputClass} name="hostname" placeholder="analytics.yourdomain.com" required suppressHydrationWarning />
          <div className="flex flex-wrap justify-end gap-2">
            <ActionButton className={secondaryButtonClass} onClick={onClose}>
              Cancel
            </ActionButton>
            <ActionButton className={buttonClass} loading={isBusy} type="submit">
              Attach replacement
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardHero({
  action,
  copy,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  copy: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-4 py-[18px] pb-[10px] max-[640px]:py-3">
      <div>
        <p className={eyebrowClass}>{eyebrow}</p>
        <h1 className="mt-2 max-w-[840px] text-[clamp(38px,5vw,58px)] leading-[0.98] tracking-normal max-[760px]:text-[clamp(34px,12vw,46px)] max-[640px]:text-[34px]">
          {title}
        </h1>
        <p className="mt-4 max-w-[650px] text-[18px] leading-[1.6] text-[var(--muted)] max-[760px]:text-[17px] max-[640px]:mt-3 max-[640px]:text-[15px]">
          {copy}
        </p>
      </div>
      {action}
    </section>
  );
}

function PanelHeading({ copy, eyebrow, title }: { copy: string; eyebrow: string; title: string }) {
  return (
    <div>
      <p className={`${eyebrowClass} m-0`}>{eyebrow}</p>
      <h2 className="mb-0 mt-2 text-[30px] leading-tight">{title}</h2>
      <p className="mb-0 mt-2 max-w-[720px] leading-[1.6] text-[var(--muted)]">{copy}</p>
    </div>
  );
}

function StepNav({
  activeIndex,
  items,
  maxIndex,
  onSelect,
}: {
  activeIndex: number;
  items: Array<{ id: string; label: string; description: string }>;
  maxIndex: number;
  onSelect: (item: { id: string; label: string; description: string }, index: number) => void;
}) {
  return (
    <nav aria-label="Create site steps" className="mt-4 grid gap-0 max-[760px]:mt-0 max-[760px]:flex max-[760px]:overflow-x-auto max-[760px]:pb-1">
      {items.map((item, index) => (
        <button
          aria-current={activeIndex === index ? "step" : undefined}
          className={[
            "relative grid min-h-[76px] grid-cols-[24px_1fr] gap-3 rounded-[10px] border-0 bg-transparent py-2.5 pl-0 pr-2.5 text-left text-[var(--muted)] max-[760px]:min-h-[50px] max-[760px]:min-w-[132px] max-[760px]:grid-cols-1 max-[760px]:justify-items-center max-[760px]:border max-[760px]:border-[var(--border)] max-[760px]:px-3 max-[760px]:text-center",
            index < items.length - 1
              ? "after:absolute after:bottom-[-34px] after:left-[11px] after:top-[34px] after:w-px after:bg-[var(--border)] after:content-[''] max-[760px]:after:bottom-auto max-[760px]:after:left-[calc(50%+18px)] max-[760px]:after:right-[-18px] max-[760px]:after:top-[20px] max-[760px]:after:h-px max-[760px]:after:w-auto"
              : "",
            index < activeIndex ? "after:bg-[var(--text)]" : "",
            activeIndex === index ? "text-[var(--text)]" : "",
            index > maxIndex ? "cursor-not-allowed opacity-45" : "",
          ].filter(Boolean).join(" ")}
          disabled={index > maxIndex}
          key={item.id}
          onClick={() => onSelect(item, index)}
          type="button"
        >
          <span className={`relative z-[1] mt-1 grid size-6 place-items-center rounded-full border bg-[var(--surface)] max-[760px]:mt-0 ${activeIndex >= index ? "border-[var(--text)]" : "border-[var(--border)]"}`}>
            <span className={`block size-2 rounded-full ${activeIndex >= index ? "bg-[var(--text)]" : "bg-[var(--border)]"}`} />
          </span>
          <span className="grid gap-1.5 max-[760px]:gap-0.5">
            <strong className="text-sm leading-[1.25] text-inherit">{item.label}</strong>
            <span className="text-xs leading-[1.35] text-[var(--muted)] max-[760px]:hidden">{item.description}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}

function EmptyState({
  action,
  copy,
  onAction,
  title,
}: {
  action: string;
  copy: string;
  onAction: () => void;
  title: string;
}) {
  return (
    <div className={`${cardClass} grid min-h-[320px] place-items-center p-6 text-center`}>
      <div className="grid max-w-[440px] gap-3">
        <h2 className="m-0 text-3xl">{title}</h2>
        <p className="m-0 leading-[1.6] text-[var(--muted)]">{copy}</p>
        <ActionButton className={`${buttonClass} mx-auto`} onClick={onAction}>
          {action}
        </ActionButton>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${subtleCardClass} p-4`}>
      <p className="m-0 text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="m-0 mt-2 truncate text-lg font-bold">{value}</p>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="block text-xs font-bold text-[var(--muted)]">{label}</span>
      <span className="block truncate font-bold">{value}</span>
    </span>
  );
}

function SiteLogo({ site }: { site: AnalyticsSite }) {
  return site.logoUrl ? (
    <img alt="" className="size-11 rounded-full border border-[var(--border)] bg-[var(--surface)] object-cover" src={site.logoUrl} />
  ) : (
    <span className="grid size-11 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-sm font-bold">
      {site.displayName.slice(0, 1).toUpperCase()}
    </span>
  );
}

function StatusPill({ status, tone = "muted" }: { status: string; tone?: "good" | "warn" | "muted" }) {
  const toneClass =
    tone === "good"
      ? "border-[var(--good)] text-[var(--good)]"
      : tone === "warn"
        ? "border-[var(--warn)] text-[var(--warn)]"
        : "";
  return <span className={`${pillClass} ${toneClass}`}>{status}</span>;
}

function ActionButton({
  children,
  className,
  disabled,
  loading = false,
  onClick,
  testId,
  type = "button",
}: {
  children: ReactNode;
  className: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  testId?: string;
  type?: "button" | "submit";
}) {
  return (
    <button className={className} data-testid={testId} disabled={disabled || loading} onClick={onClick} type={type}>
      {loading ? <Spinner /> : null}
      <span>{children}</span>
    </button>
  );
}

function Spinner() {
  return <span aria-hidden="true" className="lk-spinner" />;
}

function Field({
  label,
  name,
  value,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
}) {
  return (
    <label className={fieldLabelClass}>
      {label}
      <input className={inputClass} defaultValue={value} name={name} suppressHydrationWarning type={type} />
    </label>
  );
}

function TextArea({
  compact = false,
  label,
  name,
  value,
}: {
  compact?: boolean;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className={fieldLabelClass}>
      {label}
      <textarea
        className={`${inputClass} items-start whitespace-normal ${compact ? "min-h-[50px]" : "min-h-[84px]"}`}
        defaultValue={value}
        name={name}
        suppressHydrationWarning
      />
    </label>
  );
}

function getDnsRecords(domain: AnalyticsSiteDomain): DnsRecord[] {
  const verificationData = domain.verificationData ?? {};
  const dnsRecords = Array.isArray(verificationData.dnsRecords)
    ? (verificationData.dnsRecords as Array<Record<string, unknown>>)
    : [];
  const storedRecords = dnsRecords
    .map((record): DnsRecord | null => {
      const type = String(record.type ?? "").toUpperCase();
      const name = String(record.name ?? "");
      const value = String(record.value ?? "");
      if (!type || !name || !value) return null;
      return {
        type,
        name,
        value,
        reason: record.reason ? String(record.reason) : undefined,
      };
    })
    .filter((record): record is DnsRecord => Boolean(record));
  if (storedRecords.length > 0) return storedRecords;

  const verification = Array.isArray(verificationData.verification)
    ? (verificationData.verification as Array<Record<string, unknown>>)
    : [];
  return verification
    .map((record): DnsRecord | null => {
      const type = String(record.type ?? "TXT").toUpperCase();
      const name = String(record.name ?? record.domain ?? "");
      const value = String(record.value ?? "");
      if (!name || !value) return null;
      return {
        type,
        name,
        value,
        reason: record.reason ? String(record.reason) : undefined,
      };
    })
    .filter((record): record is DnsRecord => Boolean(record));
}

function upsertDomain(domains: AnalyticsSiteDomain[], domain: AnalyticsSiteDomain) {
  const exists = domains.some((item) => item.hostname === domain.hostname);
  return exists
    ? domains.map((item) => (item.hostname === domain.hostname ? domain : item))
    : [domain, ...domains];
}

function parseSlugs(value: string) {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
