"use client";

import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { EMPTY_CAPABILITIES, type ProtocolCapabilities } from "@/types/metrics";
import type { Tenant } from "@/types/tenant";

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

const moduleLabels: Record<keyof Tenant["enabledModules"], string> = {
  overview: "Overview",
  performance: "Performance chart",
  chains: "Chain distribution",
  economics: "Protocol economics",
  yields: "Yields",
  methodology: "Methodology",
};

const LOCAL_DEV_ADMIN_SECRET = "change-me";
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

export default function AdminBuilder() {
  const [secret, setSecret] = useState(LOCAL_DEV_ADMIN_SECRET);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [activeStep, setActiveStep] = useState<WizardStep>("protocol");
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(0);
  const [search, setSearch] = useState("");
  const [protocolOptions, setProtocolOptions] = useState<ProtocolOption[]>([]);
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.slug === selectedSlug),
    [selectedSlug, tenants],
  );
  const activeStepIndex = wizardSteps.findIndex((step) => step.id === activeStep);

  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(secret ? { "x-admin-secret": secret } : {}),
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && secret !== LOCAL_DEV_ADMIN_SECRET) {
        window.localStorage.setItem("lamma_admin_secret", LOCAL_DEV_ADMIN_SECRET);
        setSecret(LOCAL_DEV_ADMIN_SECRET);
        throw new Error("Saved admin secret was stale. Retrying with the local dev secret.");
      }

      throw new Error(payload.error ?? `Request failed with ${response.status}`);
    }
    return payload;
  }

  useEffect(() => {
    const stored = window.localStorage.getItem("lamma_admin_secret");
    const nextSecret = stored?.trim() || LOCAL_DEV_ADMIN_SECRET;
    window.localStorage.setItem("lamma_admin_secret", nextSecret);
    setSecret(nextSecret);
  }, []);

  useEffect(() => {
    if (!secret) return;
    window.localStorage.setItem("lamma_admin_secret", secret);
    void api("/api/admin/tenants")
      .then((payload) => {
        setTenants(payload.tenants);
      })
      .catch((error) => toast.error(error.message));
    // api intentionally closes over the latest secret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  useEffect(() => {
    if (!secret || search.trim().length < 2) {
      setProtocolOptions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void api(`/api/admin/protocol-search?q=${encodeURIComponent(search)}`)
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
  }, [search, secret]);

  function upsertTenant(tenant: Tenant) {
    setTenants((items) => {
      const exists = items.some((item) => item.slug === tenant.slug);
      return exists
        ? items.map((item) => (item.slug === tenant.slug ? tenant : item))
        : [...items, tenant];
    });
    setSelectedSlug(tenant.slug);
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
    const tenant: Tenant = {
      id: `tenant-${option.value}`,
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
      createdAt: now,
      updatedAt: now,
    };

    const payload = await api("/api/admin/tenants", {
      method: "POST",
      body: JSON.stringify(tenant),
    });
    upsertTenant(payload.tenant);
    setMaxUnlockedStep((step) => Math.max(step, 1));
    setActiveStep("config");
    toast.success("Tenant created");
  }

  async function saveTenant(event: FormEvent<HTMLFormElement>, nextStep?: WizardStep) {
    event.preventDefault();
    if (!selectedTenant) return;
    const form = new FormData(event.currentTarget);
    const patch: Partial<Tenant> = {
      displayName: String(form.get("displayName") ?? selectedTenant.displayName),
      protocolDescription: String(form.get("protocolDescription") ?? ""),
      logoUrl: String(form.get("logoUrl") ?? "") || null,
      websiteUrl: String(form.get("websiteUrl") ?? "") || null,
      twitterUrl: String(form.get("twitterUrl") ?? "") || null,
      primaryColor: String(form.get("primaryColor") ?? selectedTenant.primaryColor),
      accentColor: String(form.get("accentColor") ?? selectedTenant.accentColor),
      metricSources: {
        tvlProtocol:
          parseSlugs(String(form.get("tvlProtocols") ?? ""))[0] ??
          selectedTenant.metricSources.tvlProtocol,
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
        Object.keys(selectedTenant.enabledModules).map((key) => [
          key,
          form.get(`module-${key}`) === "on",
        ]),
      ) as Tenant["enabledModules"],
    };

    const payload = await api(`/api/admin/tenants/${selectedTenant.slug}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    upsertTenant(payload.tenant);
    if (nextStep) {
      const nextIndex = wizardSteps.findIndex((step) => step.id === nextStep);
      setMaxUnlockedStep((step) => Math.max(step, nextIndex));
      setActiveStep(nextStep);
    }
    toast.success("Tenant saved");
  }

  async function detectCapabilities() {
    if (!selectedTenant) return;
    const payload = await api(`/api/admin/tenants/${selectedTenant.slug}/detect-capabilities`, {
      method: "POST",
    });
    upsertTenant({ ...selectedTenant, capabilities: payload.capabilities as ProtocolCapabilities });
    toast.success("Capabilities refreshed");
  }

  async function publishTenant() {
    if (!selectedTenant) return;
    const payload = await api(`/api/admin/tenants/${selectedTenant.slug}/publish`, {
      method: "POST",
    });
    upsertTenant(payload.tenant);
    toast.success("Tenant published");
  }

  async function saveDraft() {
    if (!selectedTenant) return;
    const payload = await api(`/api/admin/tenants/${selectedTenant.slug}`, {
      method: "PATCH",
      body: JSON.stringify({ published: false }),
    });
    upsertTenant(payload.tenant);
    toast.success("Saved as draft");
  }

  async function addDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    const form = new FormData(event.currentTarget);
    const hostname = String(form.get("hostname") ?? "");
    const payload = await api("/api/admin/domains", {
      method: "POST",
      body: JSON.stringify({ tenantSlug: selectedTenant.slug, hostname }),
    });
    toast.success(`Domain ${payload.domain.hostname} added`);
    setMaxUnlockedStep((step) => Math.max(step, 3));
    setActiveStep("deploy");
    event.currentTarget.reset();
  }

  function skipDomainStep() {
    setMaxUnlockedStep((step) => Math.max(step, 3));
    setActiveStep("deploy");
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
          <span className={pillClass}>Unofficial LlamaKit prototype</span>
        </div>
      </nav>

      <section className="py-[18px] pb-[26px] max-[760px]:py-4 max-[760px]:pb-5">
        <div className="flex flex-wrap justify-between gap-[18px]">
          <div>
            <p className={eyebrowClass}>Investor Relations admin</p>
            <h1 className="mt-2 max-w-[840px] text-[clamp(38px,5vw,58px)] leading-[0.98] tracking-normal max-[760px]:max-w-[360px] max-[760px]:text-[clamp(34px,12vw,46px)]">
              Build a verified protocol hub
            </h1>
            <p className="mt-4 max-w-[650px] text-[18px] leading-[1.6] text-[var(--muted)] max-[760px]:text-[17px] max-[760px]:leading-[1.55]">
              Select one protocol or a DefiLlama parent ecosystem, configure source groups, detect
              available metrics, and publish a branded investor-ready dashboard.
            </p>
          </div>
          <label className="grid items-start gap-1.5 self-start text-[13px] text-[var(--muted)]">
            Admin secret
            <input
              className={`${inputClass} rounded-lg`}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="ADMIN_SECRET"
              suppressHydrationWarning
              type="password"
              value={secret}
            />
          </label>
        </div>
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
                    Parent options create one LlamaKit tenant with all child protocol slugs copied
                    into TVL, fee/revenue, DEX, options, and yield source groups. You can edit those
                    groups in the next step before deploying.
                  </p>
                </div>
              </div>
            ) : null}

            {activeStep === "config" ? (
              selectedTenant ? (
                <form
                  key={selectedTenant.slug}
                  onSubmit={(event) => void saveTenant(event, "domain")}
                  className="grid gap-3.5"
                >
                  <div>
                    <p className={`${eyebrowClass} m-0`}>Step 2</p>
                    <h2 className="mb-0 mt-2 text-[30px]">
                      Configure {selectedTenant.displayName}
                    </h2>
                  </div>
                  <Field
                    name="displayName"
                    label="Display name"
                    value={selectedTenant.displayName}
                  />
                  <TextArea
                    name="protocolDescription"
                    label="Protocol description"
                    value={selectedTenant.protocolDescription}
                  />
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                    <Field name="logoUrl" label="Logo URL" value={selectedTenant.logoUrl ?? ""} />
                    <Field
                      name="websiteUrl"
                      label="Website URL"
                      value={selectedTenant.websiteUrl ?? ""}
                    />
                    <Field
                      name="twitterUrl"
                      label="X URL"
                      value={selectedTenant.twitterUrl ?? ""}
                    />
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                    <Field
                      name="primaryColor"
                      label="Primary color"
                      type="color"
                      value={selectedTenant.primaryColor}
                    />
                    <Field
                      name="accentColor"
                      label="Accent color"
                      type="color"
                      value={selectedTenant.accentColor}
                    />
                  </div>
                  <div className={`${subtleCardClass} grid gap-2.5 p-3.5`}>
                    <div className="flex flex-wrap justify-between gap-3">
                      <strong>Source mapping</strong>
                      <span className={pillClass}>
                        {
                          (
                            selectedTenant.metricSources.childProtocols ?? [
                              selectedTenant.metricSources.tvlProtocol,
                            ]
                          ).length
                        }{" "}
                        protocols
                      </span>
                    </div>
                    <SourceChips
                      values={(
                        selectedTenant.metricSources.childProtocols ?? [
                          selectedTenant.metricSources.tvlProtocol,
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
                          value={selectedTenant.metricSources.parentProtocol ?? ""}
                        />
                        <TextArea
                          compact
                          name="childProtocols"
                          label="Selected child protocols"
                          value={(
                            selectedTenant.metricSources.childProtocols ?? [
                              selectedTenant.metricSources.tvlProtocol,
                            ]
                          ).join(", ")}
                        />
                        <TextArea
                          compact
                          name="tvlProtocols"
                          label="TVL sources"
                          value={(
                            selectedTenant.metricSources.tvlProtocols ?? [
                              selectedTenant.metricSources.tvlProtocol,
                            ]
                          ).join(", ")}
                        />
                        <TextArea
                          compact
                          name="feesProtocols"
                          label="Fees and revenue sources"
                          value={(
                            selectedTenant.metricSources.feesProtocols ??
                            [selectedTenant.metricSources.feesProtocol].filter(Boolean)
                          ).join(", ")}
                        />
                        <TextArea
                          compact
                          name="dexProtocols"
                          label="DEX volume sources"
                          value={(
                            selectedTenant.metricSources.dexProtocols ??
                            [selectedTenant.metricSources.dexProtocol].filter(Boolean)
                          ).join(", ")}
                        />
                        <TextArea
                          compact
                          name="optionsProtocols"
                          label="Options volume sources"
                          value={(
                            selectedTenant.metricSources.optionsProtocols ??
                            [selectedTenant.metricSources.optionsProtocol].filter(Boolean)
                          ).join(", ")}
                        />
                        <Field
                          name="yieldProjects"
                          label="Yield projects"
                          value={selectedTenant.metricSources.yieldProjects.join(", ")}
                        />
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                          <Field
                            name="priceId"
                            label="Price source"
                            value={selectedTenant.metricSources.priceId ?? ""}
                          />
                          <Field
                            name="stablecoinAssetId"
                            label="Stablecoin asset ID"
                            value={selectedTenant.metricSources.stablecoinAssetId ?? ""}
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
                              selectedTenant.enabledModules[key as keyof Tenant["enabledModules"]]
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
              selectedTenant ? (
                <div className="grid gap-[18px]">
                  <div>
                    <p className={`${eyebrowClass} m-0`}>Step 3</p>
                    <h2 className="mb-0 mt-2 text-[30px]">Attach domain</h2>
                    <p className="max-w-[720px] leading-[1.6] text-[var(--muted)]">
                      Add a custom hostname now, or skip and use the default LlamaKit tenant route
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
                </div>
              ) : (
                <EmptyStep
                  message="Select a protocol first."
                  onClick={() => setActiveStep("protocol")}
                />
              )
            ) : null}

            {activeStep === "deploy" ? (
              selectedTenant ? (
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
                    {Object.entries(selectedTenant.capabilities).map(([key, enabled]) => (
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
                      href={`/sites/${selectedTenant.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview
                    </a>
                    <button className={secondaryButtonClass} onClick={saveDraft} type="button">
                      Save draft
                    </button>
                    <button className={buttonClass} onClick={publishTenant} type="button">
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
