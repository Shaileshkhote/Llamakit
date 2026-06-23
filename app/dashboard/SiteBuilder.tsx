"use client";

import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { EMPTY_CAPABILITIES, type ProtocolCapabilities } from "@/types/metrics";
import type { User } from "@/types/auth";
import type { AnalyticsSite, AnalyticsSiteDomain } from "@/types/site";

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

type WizardStep = "protocol" | "config" | "domain" | "deploy";

type DnsRecord = {
  name: string;
  reason?: string;
  type: string;
  value: string;
};

const moduleLabels: Record<keyof AnalyticsSite["enabledModules"], string> = {
  overview: "Overview",
  performance: "Performance chart",
  chains: "Chain distribution",
  economics: "Protocol economics",
  yields: "Yields",
  methodology: "Methodology",
};

const wizardSteps: Array<{ id: WizardStep; label: string; description: string }> = [
  {
    id: "protocol",
    label: "Select protocol",
    description: "Choose one protocol or a parent ecosystem.",
  },
  { id: "config", label: "Configure", description: "Set branding, modules, and data sources." },
  { id: "domain", label: "Domain", description: "Attach a custom hostname or skip." },
  { id: "deploy", label: "Deploy", description: "Publish the portal or keep it as draft." },
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
  "mx-auto w-[min(1160px,calc(100vw-40px))] pb-14 max-[760px]:w-[min(1160px,calc(100vw-24px))]";
const topbarClass =
  "flex items-center justify-between gap-[18px] py-[22px] max-[760px]:flex-col max-[760px]:items-start";
const brandClass = "inline-flex items-center gap-2.5 text-[15px] font-bold";
const brandMarkClass =
  "grid size-[30px] place-items-center rounded-full border border-[var(--border)] bg-[var(--text)] text-xs text-[var(--surface)]";
const pillClass =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-[11px] py-[7px] text-xs leading-none text-[var(--muted)]";
const cardClass = "min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)]";
const subtleCardClass = "rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)]";
const eyebrowClass = "text-[13px] font-semibold text-[var(--muted)]";
const buttonClass =
  "inline-flex min-h-[42px] items-center justify-center rounded-lg border border-[var(--text)] bg-[var(--text)] px-[18px] text-sm font-bold text-[var(--surface)]";
const secondaryButtonClass =
  "inline-flex min-h-[42px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-[18px] text-sm font-bold text-[var(--text)]";
const inputClass = `${pillClass} w-full justify-start rounded-xl text-left`;
const fieldLabelClass = "grid gap-[5px] text-[13px] text-[var(--muted)]";
const adminGridClass = "grid grid-cols-12 gap-3.5 max-[760px]:grid-cols-1";

export default function SiteBuilder({ user }: { user: User }) {
  const [sites, setAnalyticsSites] = useState<AnalyticsSite[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [activeStep, setActiveStep] = useState<WizardStep>("protocol");
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(0);
  const [search, setSearch] = useState("");
  const [protocolOptions, setProtocolOptions] = useState<ProtocolOption[]>([]);
  const [attachedDomain, setAttachedDomain] = useState<AnalyticsSiteDomain | null>(null);
  const selectedAnalyticsSite = useMemo(
    () => sites.find((site) => site.slug === selectedSlug),
    [selectedSlug, sites],
  );
  const activeStepIndex = wizardSteps.findIndex((step) => step.id === activeStep);

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

  useEffect(() => {
    void api("/api/sites")
      .then((payload) => {
        setAnalyticsSites(payload.sites);
      })
      .catch((error) => toast.error(error.message));
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
    // api intentionally closes over the latest secret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function upsertAnalyticsSite(site: AnalyticsSite) {
    setAnalyticsSites((items) => {
      const exists = items.some((item) => item.slug === site.slug);
      return exists
        ? items.map((item) => (item.slug === site.slug ? site : item))
        : [...items, site];
    });
    setSelectedSlug(site.slug);
  }

  function goToStep(step: WizardStep, index: number) {
    if (index > maxUnlockedStep) {
      toast.error("Complete the current step first");
      return;
    }
    setActiveStep(step);
  }

  async function createFromProtocol(option: ProtocolOption | null) {
    if (!option) return;
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
    setMaxUnlockedStep((step) => Math.max(step, 1));
    setActiveStep("config");
    toast.success("Analytics site created");
  }

  async function saveAnalyticsSite(event: FormEvent<HTMLFormElement>, nextStep?: WizardStep) {
    event.preventDefault();
    if (!selectedAnalyticsSite) return;
    const form = new FormData(event.currentTarget);
    const patch: Partial<AnalyticsSite> = {
      displayName: String(form.get("displayName") ?? selectedAnalyticsSite.displayName),
      protocolDescription: String(form.get("protocolDescription") ?? ""),
      logoUrl: String(form.get("logoUrl") ?? "") || null,
      websiteUrl: String(form.get("websiteUrl") ?? "") || null,
      twitterUrl: String(form.get("twitterUrl") ?? "") || null,
      primaryColor: String(form.get("primaryColor") ?? selectedAnalyticsSite.primaryColor),
      accentColor: String(form.get("accentColor") ?? selectedAnalyticsSite.accentColor),
      metricSources: {
        tvlProtocol:
          parseSlugs(String(form.get("tvlProtocols") ?? ""))[0] ??
          selectedAnalyticsSite.metricSources.tvlProtocol,
        tvlProtocols: parseSlugs(String(form.get("tvlProtocols") ?? "")),
        feesProtocol: parseSlugs(String(form.get("feesProtocols") ?? ""))[0] ?? null,
        feesProtocols: parseSlugs(String(form.get("feesProtocols") ?? "")),
        dexProtocol: parseSlugs(String(form.get("dexProtocols") ?? ""))[0] ?? null,
        dexProtocols: parseSlugs(String(form.get("dexProtocols") ?? "")),
        optionsProtocol: parseSlugs(String(form.get("optionsProtocols") ?? ""))[0] ?? null,
        optionsProtocols: parseSlugs(String(form.get("optionsProtocols") ?? "")),
        yieldProjects: String(form.get("yieldProjects") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        priceId: String(form.get("priceId") ?? "") || null,
        stablecoinAssetId: String(form.get("stablecoinAssetId") ?? "") || null,
        parentProtocol: String(form.get("parentProtocol") ?? "") || null,
        childProtocols: parseSlugs(String(form.get("childProtocols") ?? "")),
      },
      enabledModules: Object.fromEntries(
        Object.keys(selectedAnalyticsSite.enabledModules).map((key) => [
          key,
          form.get(`module-${key}`) === "on",
        ]),
      ) as AnalyticsSite["enabledModules"],
    };

    const payload = await api(`/api/sites/${selectedAnalyticsSite.slug}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    upsertAnalyticsSite(payload.site);
    if (nextStep) {
      const nextIndex = wizardSteps.findIndex((step) => step.id === nextStep);
      setMaxUnlockedStep((step) => Math.max(step, nextIndex));
      setActiveStep(nextStep);
    }
    toast.success("Analytics site saved");
  }

  async function detectCapabilities() {
    if (!selectedAnalyticsSite) return;
    const payload = await api(`/api/sites/${selectedAnalyticsSite.slug}/detect-capabilities`, {
      method: "POST",
    });
    upsertAnalyticsSite({ ...selectedAnalyticsSite, capabilities: payload.capabilities as ProtocolCapabilities });
    toast.success("Capabilities refreshed");
  }

  async function publishAnalyticsSite() {
    if (!selectedAnalyticsSite) return;
    const payload = await api(`/api/sites/${selectedAnalyticsSite.slug}/publish`, {
      method: "POST",
    });
    upsertAnalyticsSite(payload.site);
    toast.success("Analytics site published");
  }

  async function saveDraft() {
    if (!selectedAnalyticsSite) return;
    const payload = await api(`/api/sites/${selectedAnalyticsSite.slug}/draft`, {
      method: "POST",
    });
    upsertAnalyticsSite(payload.site);
    toast.success("Saved as draft");
  }

  async function addDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAnalyticsSite) return;
    const form = new FormData(event.currentTarget);
    const hostname = String(form.get("hostname") ?? "");
    const payload = await api(`/api/sites/${selectedAnalyticsSite.slug}/domains`, {
      method: "POST",
      body: JSON.stringify({ hostname }),
    });
    setAttachedDomain(payload.domain);
    toast.success(`Domain ${payload.domain.hostname} added. Add the DNS records below.`);
    setMaxUnlockedStep((step) => Math.max(step, 3));
    event.currentTarget.reset();
  }

  async function refreshDomainStatus(hostname: string) {
    if (!selectedAnalyticsSite) return;
    const payload = await api(
      `/api/sites/${selectedAnalyticsSite.slug}/domains/${encodeURIComponent(hostname)}/status`,
    );
    setAttachedDomain(payload.domain);
    toast.success(
      payload.domain.status === "active" ? "Domain is active" : "Verification status refreshed",
    );
  }

  function skipDomainStep() {
    setMaxUnlockedStep((step) => Math.max(step, 3));
    setActiveStep("deploy");
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }

  return (
    <main className={shellClass}>
      <nav className={topbarClass}>
        <a className={brandClass} href="/">
          <span className={brandMarkClass}>DL</span>
          <span>DefiLlama</span>
        </a>
        <div className="flex flex-wrap gap-2.5">
          <ThemeToggle />
          <span className={pillClass}>{user.email}</span>
          <button className={secondaryButtonClass} onClick={() => void logout()} type="button">
            Logout
          </button>
          <span className={pillClass}>Unofficial LlamaKit prototype</span>
        </div>
      </nav>

      <section className="py-[18px] pb-[26px] max-[760px]:py-4 max-[760px]:pb-5">
        <div className="flex flex-wrap justify-between gap-[18px]">
          <div>
            <p className={eyebrowClass}>Dashboard</p>
            <h1 className="mt-2 max-w-[840px] text-[clamp(38px,5vw,58px)] leading-[0.98] tracking-normal max-[760px]:max-w-[360px] max-[760px]:text-[clamp(34px,12vw,46px)]">
              Build and manage analytics sites
            </h1>
            <p className="mt-4 max-w-[650px] text-[18px] leading-[1.6] text-[var(--muted)] max-[760px]:text-[17px] max-[760px]:leading-[1.55]">
              Select one protocol or a DefiLlama parent ecosystem, configure source groups, detect
              available metrics, and publish a branded analytics site.
            </p>
          </div>
        </div>
      </section>

      <section className={`${cardClass} mb-3.5 grid gap-3 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`${eyebrowClass} m-0`}>My analytics sites</p>
            <h2 className="m-0 mt-1 text-2xl">{sites.length ? `${sites.length} site${sites.length === 1 ? "" : "s"}` : "No sites yet"}</h2>
          </div>
          <button
            className={secondaryButtonClass}
            onClick={() => {
              setSelectedSlug("");
              setActiveStep("protocol");
              setMaxUnlockedStep(0);
            }}
            type="button"
          >
            Create analytics site
          </button>
        </div>
        {sites.length ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5">
            {sites.map((site) => (
              <button
                className={`${subtleCardClass} grid gap-2 p-3 text-left`}
                key={site.slug}
                onClick={() => {
                  setSelectedSlug(site.slug);
                  setActiveStep("config");
                  setMaxUnlockedStep(3);
                }}
                type="button"
              >
                <span className="flex items-center justify-between gap-3">
                  <strong>{site.displayName}</strong>
                  <span className={pillClass}>{site.published ? "live" : "draft"}</span>
                </span>
                <span className="text-sm text-[var(--muted)]">/sites/{site.slug}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="m-0 text-sm leading-[1.55] text-[var(--muted)]">
            Create your first analytics site from DefiLlama verified protocol data.
          </p>
        )}
      </section>

      <section className={adminGridClass}>
        <aside className="col-span-3 self-start max-[760px]:col-span-1">
          <div className={`${cardClass} p-[18px] max-[760px]:p-4`}>
            <p className={`${eyebrowClass} m-0`}>Setup</p>
            <nav aria-label="Builder steps" className="mt-[18px] grid gap-0 max-[760px]:mt-3.5">
              {wizardSteps.map((step, index) => (
                <button
                  className={[
                    "relative grid min-h-[76px] grid-cols-[24px_1fr] gap-3 rounded-[10px] border-0 bg-transparent py-2.5 pl-0 pr-2.5 text-left text-[var(--muted)] max-[760px]:min-h-[62px]",
                    index < wizardSteps.length - 1
                      ? "after:absolute after:bottom-[-34px] after:left-[11px] after:top-[34px] after:w-px after:bg-[var(--border)] after:content-['']"
                      : "",
                    index < activeStepIndex ? "after:bg-[var(--text)]" : "",
                    activeStep === step.id ? "text-[var(--text)]" : "",
                    index > maxUnlockedStep ? "cursor-not-allowed opacity-45" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={activeStep === step.id ? "step" : undefined}
                  disabled={index > maxUnlockedStep}
                  key={step.id}
                  onClick={() => goToStep(step.id, index)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={[
                      "relative z-[1] mt-1 grid size-6 place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)]",
                      activeStep === step.id || index < activeStepIndex
                        ? "border-[var(--text)]"
                        : "",
                      index > maxUnlockedStep ? "border-[var(--border)]" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span
                      className={[
                        "block size-2 rounded-full bg-[var(--border-strong)]",
                        activeStep === step.id || index < activeStepIndex
                          ? "bg-[var(--text)]"
                          : "",
                        index > maxUnlockedStep ? "bg-[var(--border)]" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  </span>
                  <span className="grid gap-1.5">
                    <strong className="text-sm leading-[1.25] text-inherit">{step.label}</strong>
                    <span className="text-xs leading-[1.35] text-[var(--muted)]">
                      {step.description}
                    </span>
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section className={`${cardClass} col-span-9 overflow-hidden max-[760px]:col-span-1`}>
          <div className="p-8 max-[760px]:p-6">
            {activeStep === "protocol" ? (
              <div className="grid gap-[18px]">
                <div>
                  <p className={`${eyebrowClass} m-0`}>Step 1</p>
                  <h2 className="mb-0 mt-2 text-[30px]">Select protocol</h2>
                  <p className="max-w-[720px] leading-[1.6] text-[var(--muted)]">
                    Search for a protocol or parent ecosystem. Selecting PancakeSwap ecosystem will
                    automatically include all child protocols under `parent#pancakeswap`.
                  </p>
                </div>
                <Select
                  instanceId="protocol-search"
                  inputId="protocol-search-input"
                  inputValue={search}
                  onChange={(value) => void createFromProtocol(value as ProtocolOption | null)}
                  onInputChange={(value) => setSearch(value)}
                  options={protocolOptions}
                  placeholder="Search DefiLlama protocols"
                  styles={selectStyles}
                />
                <div className={`${subtleCardClass} p-4`}>
                  <strong>Parent protocol behavior</strong>
                  <p className="mb-0 leading-[1.6] text-[var(--muted)]">
                    Parent options create one LlamaKit site with all child protocol slugs copied
                    into TVL, fee/revenue, DEX, options, and yield source groups. You can edit those
                    groups in the next step before deploying.
                  </p>
                </div>
              </div>
            ) : null}

            {activeStep === "config" ? (
              selectedAnalyticsSite ? (
                <form
                  key={selectedAnalyticsSite.slug}
                  onSubmit={(event) => void saveAnalyticsSite(event, "domain")}
                  className="grid gap-3.5"
                >
                  <div>
                    <p className={`${eyebrowClass} m-0`}>Step 2</p>
                    <h2 className="mb-0 mt-2 text-[30px]">
                      Configure {selectedAnalyticsSite.displayName}
                    </h2>
                  </div>
                  <Field
                    name="displayName"
                    label="Display name"
                    value={selectedAnalyticsSite.displayName}
                  />
                  <TextArea
                    name="protocolDescription"
                    label="Protocol description"
                    value={selectedAnalyticsSite.protocolDescription}
                  />
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                    <Field name="logoUrl" label="Logo URL" value={selectedAnalyticsSite.logoUrl ?? ""} />
                    <Field
                      name="websiteUrl"
                      label="Website URL"
                      value={selectedAnalyticsSite.websiteUrl ?? ""}
                    />
                    <Field
                      name="twitterUrl"
                      label="X URL"
                      value={selectedAnalyticsSite.twitterUrl ?? ""}
                    />
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                    <Field
                      name="primaryColor"
                      label="Primary color"
                      type="color"
                      value={selectedAnalyticsSite.primaryColor}
                    />
                    <Field
                      name="accentColor"
                      label="Accent color"
                      type="color"
                      value={selectedAnalyticsSite.accentColor}
                    />
                  </div>
                  <div className={`${subtleCardClass} grid gap-2.5 p-3.5`}>
                    <div className="flex flex-wrap justify-between gap-3">
                      <strong>Source mapping</strong>
                      <span className={pillClass}>
                        {
                          (
                            selectedAnalyticsSite.metricSources.childProtocols ?? [
                              selectedAnalyticsSite.metricSources.tvlProtocol,
                            ]
                          ).length
                        }{" "}
                        protocols
                      </span>
                    </div>
                    <SourceChips
                      values={(
                        selectedAnalyticsSite.metricSources.childProtocols ?? [
                          selectedAnalyticsSite.metricSources.tvlProtocol,
                        ]
                      ).slice(0, 8)}
                    />
                    <details>
                      <summary className="cursor-pointer font-bold">
                        Advanced source mapping
                      </summary>
                      <div className="mt-3 grid gap-2.5">
                        <Field
                          name="parentProtocol"
                          label="Parent protocol"
                          value={selectedAnalyticsSite.metricSources.parentProtocol ?? ""}
                        />
                        <TextArea
                          compact
                          name="childProtocols"
                          label="Selected child protocols"
                          value={(
                            selectedAnalyticsSite.metricSources.childProtocols ?? [
                              selectedAnalyticsSite.metricSources.tvlProtocol,
                            ]
                          ).join(", ")}
                        />
                        <TextArea
                          compact
                          name="tvlProtocols"
                          label="TVL sources"
                          value={(
                            selectedAnalyticsSite.metricSources.tvlProtocols ?? [
                              selectedAnalyticsSite.metricSources.tvlProtocol,
                            ]
                          ).join(", ")}
                        />
                        <TextArea
                          compact
                          name="feesProtocols"
                          label="Fees and revenue sources"
                          value={(
                            selectedAnalyticsSite.metricSources.feesProtocols ??
                            [selectedAnalyticsSite.metricSources.feesProtocol].filter(Boolean)
                          ).join(", ")}
                        />
                        <TextArea
                          compact
                          name="dexProtocols"
                          label="DEX volume sources"
                          value={(
                            selectedAnalyticsSite.metricSources.dexProtocols ??
                            [selectedAnalyticsSite.metricSources.dexProtocol].filter(Boolean)
                          ).join(", ")}
                        />
                        <TextArea
                          compact
                          name="optionsProtocols"
                          label="Options volume sources"
                          value={(
                            selectedAnalyticsSite.metricSources.optionsProtocols ??
                            [selectedAnalyticsSite.metricSources.optionsProtocol].filter(Boolean)
                          ).join(", ")}
                        />
                        <Field
                          name="yieldProjects"
                          label="Yield projects"
                          value={selectedAnalyticsSite.metricSources.yieldProjects.join(", ")}
                        />
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                          <Field
                            name="priceId"
                            label="Price source"
                            value={selectedAnalyticsSite.metricSources.priceId ?? ""}
                          />
                          <Field
                            name="stablecoinAssetId"
                            label="Stablecoin asset ID"
                            value={selectedAnalyticsSite.metricSources.stablecoinAssetId ?? ""}
                          />
                        </div>
                      </div>
                    </details>
                  </div>
                  <div>
                    <strong className="mb-2 block">Modules</strong>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(moduleLabels).map(([key, label]) => (
                        <label className={pillClass} key={key}>
                          <input
                            defaultChecked={
                              selectedAnalyticsSite.enabledModules[key as keyof AnalyticsSite["enabledModules"]]
                            }
                            name={`module-${key}`}
                            suppressHydrationWarning
                            type="checkbox"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2.5">
                    <button
                      className={secondaryButtonClass}
                      onClick={() => setActiveStep("protocol")}
                      type="button"
                    >
                      Back
                    </button>
                    <button className={buttonClass} type="submit">
                      Save and continue
                    </button>
                  </div>
                </form>
              ) : (
                <EmptyStep
                  message="Select a protocol first."
                  onClick={() => setActiveStep("protocol")}
                />
              )
            ) : null}

            {activeStep === "domain" ? (
              selectedAnalyticsSite ? (
                <div className="grid gap-[18px]">
                  <div>
                    <p className={`${eyebrowClass} m-0`}>Step 3</p>
                    <h2 className="mb-0 mt-2 text-[30px]">Attach domain</h2>
                    <p className="max-w-[720px] leading-[1.6] text-[var(--muted)]">
                      Add a custom hostname now, or skip and use the default LlamaKit site route
                      for the MVP preview.
                    </p>
                  </div>
                  <form className="grid max-w-[560px] gap-3" onSubmit={addDomain}>
                    <input
                      className={inputClass}
                      name="hostname"
                      placeholder="analytics.yourdomain.com"
                      required
                      suppressHydrationWarning
                    />
                    <div className="flex flex-wrap gap-2.5">
                      <button className={buttonClass} type="submit">
                        Attach domain
                      </button>
                      <button
                        className={secondaryButtonClass}
                        onClick={skipDomainStep}
                        type="button"
                      >
                        Skip for now
                      </button>
                    </div>
                  </form>
                  {attachedDomain ? (
                    <DomainInstructions
                      domain={attachedDomain}
                      onContinue={() => setActiveStep("deploy")}
                      onRefresh={() => void refreshDomainStatus(attachedDomain.hostname)}
                    />
                  ) : null}
                </div>
              ) : (
                <EmptyStep
                  message="Select a protocol first."
                  onClick={() => setActiveStep("protocol")}
                />
              )
            ) : null}

            {activeStep === "deploy" ? (
              selectedAnalyticsSite ? (
                <div className="grid gap-[18px]">
                  <div>
                    <p className={`${eyebrowClass} m-0`}>Step 4</p>
                    <h2 className="mb-0 mt-2 text-[30px]">Deploy or save draft</h2>
                    <p className="max-w-[720px] leading-[1.6] text-[var(--muted)]">
                      Run capability detection, preview the dashboard, then publish when the source
                      groups look correct.
                    </p>
                  </div>
                  <div className="grid grid-cols-12 gap-3.5 max-[760px]:grid-cols-1">
                    {Object.entries(selectedAnalyticsSite.capabilities).map(([key, enabled]) => (
                      <div
                        className={`${pillClass} col-span-3 justify-between max-[760px]:col-span-1`}
                        key={key}
                      >
                        <span>{key}</span>
                        <span>{enabled ? "yes" : "no"}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      className={secondaryButtonClass}
                      onClick={detectCapabilities}
                      type="button"
                    >
                      Detect capabilities
                    </button>
                    <a
                      className={secondaryButtonClass}
                      href={`/sites/${selectedAnalyticsSite.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview
                    </a>
                    <button className={secondaryButtonClass} onClick={saveDraft} type="button">
                      Save draft
                    </button>
                    <button className={buttonClass} onClick={publishAnalyticsSite} type="button">
                      Deploy
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyStep
                  message="Select a protocol first."
                  onClick={() => setActiveStep("protocol")}
                />
              )
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function DomainInstructions({
  domain,
  onContinue,
  onRefresh,
}: {
  domain: AnalyticsSiteDomain;
  onContinue: () => void;
  onRefresh: () => void;
}) {
  const records = getDnsRecords(domain);

  return (
    <div className={`${subtleCardClass} grid gap-4 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`${eyebrowClass} m-0`}>DNS setup</p>
          <h3 className="mb-0 mt-1 text-xl">{domain.hostname}</h3>
          <p className="mb-0 mt-2 max-w-[720px] text-sm leading-[1.55] text-[var(--muted)]">
            Add these records in the DNS provider for the root domain. For example, if the hostname
            is `sky.vibecrypto.fun`, open DNS for `vibecrypto.fun` and add the CNAME host `sky`.
          </p>
        </div>
        <span className={pillClass}>{domain.status}</span>
      </div>

      {records.length ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="grid grid-cols-[110px_minmax(160px,1fr)_minmax(220px,1.3fr)] border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-bold text-[var(--muted)] max-[760px]:hidden">
            <span className="px-3 py-2">Type</span>
            <span className="px-3 py-2">Name / Host</span>
            <span className="px-3 py-2">Value</span>
          </div>
          {records.map((record, index) => (
            <div
              className="grid grid-cols-[110px_minmax(160px,1fr)_minmax(220px,1.3fr)] border-b border-[var(--border)] text-sm last:border-b-0 max-[760px]:grid-cols-1"
              key={`${record.type}-${record.name}-${index}`}
            >
              <span className="px-3 py-2 font-bold uppercase max-[760px]:pb-0">
                {record.type}
              </span>
              <code className="break-all px-3 py-2 text-[13px] text-[var(--text)]">
                {record.name}
              </code>
              <code className="break-all px-3 py-2 text-[13px] text-[var(--text)]">
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
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-[1.55] text-[var(--muted)]">
          Vercel did not return an exact DNS record through the API for this domain. If your Vercel
          dashboard says "DNS Change Recommended", use that dashboard value exactly instead of a
          generic CNAME.
        </div>
      )}

      <div className="grid gap-2 text-sm leading-[1.55] text-[var(--muted)]">
        <p className="m-0">
          DNS can take a few minutes to propagate. After adding the records, click check status. Do
          not publish the custom domain as active until Vercel marks it verified.
        </p>
        {domain.verificationData?.error ? (
          <p className="m-0 text-[var(--bad)]">{String(domain.verificationData.error)}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button className={secondaryButtonClass} onClick={onRefresh} type="button">
          Check status
        </button>
        <button className={buttonClass} onClick={onContinue} type="button">
          Continue to deploy
        </button>
      </div>
    </div>
  );
}

function getDnsRecords(domain: AnalyticsSiteDomain): DnsRecord[] {
  const verificationData = domain.verificationData ?? {};
  const cname =
    typeof verificationData.cname === "string" && verificationData.cname
      ? verificationData.cname
      : null;
  const verification = Array.isArray(verificationData.verification)
    ? (verificationData.verification as Array<Record<string, unknown>>)
    : [];
  const verificationRecords = verification
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
  const exactVerificationRecords = verificationRecords.filter(
    (record) => record.type !== "CNAME" || !isGenericVercelCname(record.value),
  );
  const hasExactVercelCname = exactVerificationRecords.some((record) => record.type === "CNAME");
  const shouldShowStoredCname = cname != null && !isGenericVercelCname(cname);

  return [
    ...(hasExactVercelCname
      ? []
      : shouldShowStoredCname
        ? [
            {
              type: "CNAME",
              name: dnsHostLabel(domain.hostname),
              value: cname,
              reason: `Vercel-recommended CNAME for ${domain.hostname}.`,
            },
          ]
        : []),
    ...exactVerificationRecords,
  ];
}

function isGenericVercelCname(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\.$/, "");
  return normalized === "cname.vercel-dns.com" || normalized === "cname.vercel.com";
}

function dnsHostLabel(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(0, -2).join(".");
}

function parseSlugs(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function EmptyStep({ message, onClick }: { message: string; onClick: () => void }) {
  return (
    <div className={`${subtleCardClass} grid gap-3 p-[18px]`}>
      <strong>{message}</strong>
      <button className={buttonClass} onClick={onClick} type="button">
        Go to protocol selection
      </button>
    </div>
  );
}

function SourceChips({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span className={pillClass} key={value}>
          {value}
        </span>
      ))}
    </div>
  );
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
      <input
        className={inputClass}
        defaultValue={value}
        name={name}
        suppressHydrationWarning
        type={type}
      />
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
