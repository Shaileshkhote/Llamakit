import { env } from "@/lib/env";
import { createDomain, deleteDomain, getDomain, updateDomain } from "@/lib/tenancy/store";
import type { AnalyticsSite, AnalyticsSiteDomain, DnsRecord } from "@/types/site";

type DomainStatus = "pending" | "verified" | "error";
type DomainVerification = {
  type: "txt" | "cname" | "a" | "unknown";
  name: string;
  value: string;
  reason?: string;
};

export interface VercelDomainResult {
  hostname: string;
  status: DomainStatus;
  configured: boolean;
  dnsRecords: DnsRecord[];
  verification: DomainVerification[];
  error?: string;
}

export interface VercelDomainClient {
  addProjectDomain(hostname: string): Promise<VercelDomainResult>;
  removeProjectDomain(hostname: string): Promise<void>;
  getProjectDomain(hostname: string): Promise<VercelDomainResult>;
  verifyProjectDomain(hostname: string): Promise<VercelDomainResult>;
}

interface VercelApiConfig {
  token?: string;
  projectId?: string;
  teamId?: string;
}

type VercelDomainResponse = {
  name?: string;
  apexName?: string;
  verified?: boolean;
  verification?: Array<Record<string, unknown>>;
  error?: { message?: string } | string;
};

type VercelDomainConfigResponse = Record<string, unknown> & {
  configuredBy?: string | null;
  misconfigured?: boolean;
  error?: { message?: string } | string;
};

function normalizeForVercel(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
}

function verificationFromVercel(value: unknown): DomainVerification[] {
  const records = Array.isArray(value) ? value : [];
  return records.map((record) => {
    const item = record as Record<string, string | undefined>;
    const type = item.type?.toUpperCase();
    return {
      type: type === "TXT" ? "txt" : type === "CNAME" ? "cname" : type === "A" ? "a" : "unknown",
      name: item.domain || item.name || "_vercel",
      value: item.value || item.reason || "",
      reason: item.reason,
    };
  });
}

function payloadError(payload: VercelDomainResponse) {
  return typeof payload.error === "string" ? payload.error : payload.error?.message;
}

function configError(payload?: VercelDomainConfigResponse | null) {
  if (!payload) return undefined;
  return typeof payload.error === "string" ? payload.error : payload.error?.message;
}

function resultFromPayload(
  hostname: string,
  payload: VercelDomainResponse,
  config?: VercelDomainConfigResponse | null,
): VercelDomainResult {
  const verification = verificationFromVercel(payload.verification);
  const dnsRecords = dnsRecordsFromVercel(hostname, payload, config, verification);
  const hasConfig = config != null && !configError(config);
  const configured = hasConfig ? config?.misconfigured === false : false;
  const error = payloadError(payload) || configError(config);

  return {
    hostname: payload.name || hostname,
    status: payload.verified && configured ? "verified" : error ? "error" : "pending",
    configured,
    dnsRecords,
    verification,
    error,
  };
}

function dnsRecordsFromVercel(
  hostname: string,
  payload: VercelDomainResponse,
  config: VercelDomainConfigResponse | null | undefined,
  verification: DomainVerification[],
): DnsRecord[] {
  const records = new Map<string, DnsRecord>();

  for (const record of verification) {
    if (!record.value) continue;
    const normalizedType = record.type.toUpperCase();
    const value = record.value.trim();
    if (normalizedType === "CNAME" && isGenericVercelCname(value)) continue;

    addDnsRecord(records, {
      type: normalizedType,
      name: normalizeDnsRecordName(record.name, hostname, normalizedType),
      value,
      reason: record.reason,
    });
  }

  const exactCnameTargets = findStrings(config, (value) => isExactVercelDnsTarget(value));
  for (const value of exactCnameTargets) {
    addDnsRecord(records, {
      type: "CNAME",
      name: dnsHostLabel(hostname),
      value,
      reason: `Route ${hostname} to the LlamaKit Vercel project.`,
    });
  }

  const configuredBy = typeof config?.configuredBy === "string" ? config.configuredBy.toUpperCase() : "";
  const aTargets = findStrings(config, (value) => value.trim() === "76.76.21.21");
  if (configuredBy === "A" || (records.size === 0 && aTargets.length > 0)) {
    for (const value of aTargets.length ? aTargets : ["76.76.21.21"]) {
      addDnsRecord(records, {
        type: "A",
        name: dnsHostLabel(hostname),
        value,
        reason: `Route ${hostname} to Vercel.`,
      });
    }
  }

  return Array.from(records.values());
}

function addDnsRecord(records: Map<string, DnsRecord>, record: DnsRecord) {
  records.set(`${record.type}:${record.name}:${record.value}`, record);
}

function findStrings(value: unknown, predicate: (value: string) => boolean, seen = new WeakSet<object>()): string[] {
  if (typeof value === "string") return predicate(value) ? [value.trim()] : [];
  if (!value || typeof value !== "object") return [];
  if (seen.has(value)) return [];
  seen.add(value);

  const found: string[] = [];
  for (const item of Array.isArray(value) ? value : Object.values(value)) {
    found.push(...findStrings(item, predicate, seen));
  }
  return Array.from(new Set(found));
}

function isGenericVercelCname(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\.$/, "");
  return normalized === "cname.vercel-dns.com" || normalized === "cname.vercel.com";
}

function isExactVercelDnsTarget(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\.$/, "");
  return normalized.endsWith(".vercel-dns.com") && !isGenericVercelCname(normalized);
}

function normalizeDnsRecordName(name: string, hostname: string, type: string) {
  if (type === "TXT" && name === hostname) return `_vercel.${dnsHostLabel(hostname)}`;
  if (name.endsWith(`.${hostname}`)) return name.slice(0, -hostname.length - 1);
  return name || dnsHostLabel(hostname);
}

function dnsHostLabel(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length <= 2) return "@";
  return parts.slice(0, -2).join(".");
}

function statusForResult(result: VercelDomainResult): AnalyticsSiteDomain["status"] {
  if (result.status === "verified" && result.configured) return "active";
  if (result.status === "error" && result.dnsRecords.length === 0) return "failed";
  return "verifying";
}

class RealVercelDomainClient implements VercelDomainClient {
  constructor(private readonly config: Required<Pick<VercelApiConfig, "token" | "projectId">> & Pick<VercelApiConfig, "teamId">) {}

  async addProjectDomain(hostname: string): Promise<VercelDomainResult> {
    const payload = await this.request<VercelDomainResponse>("/domains", {
      method: "POST",
      body: JSON.stringify({ name: hostname }),
    });
    const config = await this.getDomainConfig(hostname);
    return resultFromPayload(hostname, payload, config);
  }

  async removeProjectDomain(hostname: string): Promise<void> {
    await this.request(`/domains/${encodeURIComponent(hostname)}`, { method: "DELETE" });
  }

  async getProjectDomain(hostname: string): Promise<VercelDomainResult> {
    const payload = await this.request<VercelDomainResponse>(`/domains/${encodeURIComponent(hostname)}`, { method: "GET" });
    const config = await this.getDomainConfig(hostname);
    return resultFromPayload(hostname, payload, config);
  }

  async verifyProjectDomain(hostname: string): Promise<VercelDomainResult> {
    const payload = await this.request<VercelDomainResponse>(`/domains/${encodeURIComponent(hostname)}/verify`, { method: "POST" });
    const config = await this.getDomainConfig(hostname);
    return resultFromPayload(hostname, payload, config);
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const team = this.config.teamId ? `?teamId=${encodeURIComponent(this.config.teamId)}` : "";
    const response = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(this.config.projectId)}${path}${team}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.config.token}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });

    const payload = (await response.json().catch(() => ({}))) as T & VercelDomainResponse;
    if (!response.ok) {
      throw new Error(payloadError(payload) || `Vercel API request failed with ${response.status}.`);
    }

    return payload;
  }

  private async getDomainConfig(hostname: string): Promise<VercelDomainConfigResponse | null> {
    const team = this.config.teamId ? `?teamId=${encodeURIComponent(this.config.teamId)}` : "";
    const response = await fetch(`https://api.vercel.com/v6/domains/${encodeURIComponent(hostname)}/config${team}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${this.config.token}`,
        "content-type": "application/json",
      },
    });
    const payload = (await response.json().catch(() => ({}))) as VercelDomainConfigResponse;

    if (!response.ok) {
      return {
        error: payload.error || { message: `Vercel domain-config request failed with ${response.status}.` },
      };
    }

    return payload;
  }
}

class StubVercelDomainClient implements VercelDomainClient {
  async addProjectDomain(hostname: string): Promise<VercelDomainResult> {
    return this.pending(hostname);
  }

  async removeProjectDomain(): Promise<void> {}

  async getProjectDomain(hostname: string): Promise<VercelDomainResult> {
    return this.pending(hostname);
  }

  async verifyProjectDomain(hostname: string): Promise<VercelDomainResult> {
    return this.pending(hostname);
  }

  private pending(hostname: string): VercelDomainResult {
    return {
      hostname,
      status: "pending",
      configured: false,
      dnsRecords: [],
      verification: [
        {
          type: "txt",
          name: `_vercel.${hostname}`,
          value: "stub-verification-token",
          reason: "Set VERCEL_API_TOKEN and VERCEL_PROJECT_ID to use the real Vercel Domains API.",
        },
      ],
    };
  }
}

export function createVercelDomainClient(config: VercelApiConfig = {}): VercelDomainClient {
  const token = config.token || env.VERCEL_API_TOKEN;
  const projectId = config.projectId || env.VERCEL_PROJECT_ID;
  const teamId = config.teamId || env.VERCEL_TEAM_ID;

  if (token && projectId) {
    return new RealVercelDomainClient({ token, projectId, teamId });
  }

  return new StubVercelDomainClient();
}

export async function addCustomDomain(site: AnalyticsSite, hostname: string): Promise<AnalyticsSiteDomain> {
  const normalized = normalizeForVercel(hostname);
  const result = await createVercelDomainClient().addProjectDomain(normalized);

  return await createDomain({
    analyticsSiteId: site.id,
    hostname: result.hostname,
    type: "custom",
    status: statusForResult(result),
    verificationData: {
      configured: result.configured,
      dnsRecords: result.dnsRecords,
      verification: result.verification,
      error: result.error,
    },
  });
}

export async function refreshCustomDomain(hostname: string) {
  const existing = await getDomain(normalizeForVercel(hostname));
  if (!existing) return null;

  const result = await createVercelDomainClient().verifyProjectDomain(existing.hostname);
  return await updateDomain(existing.hostname, {
    status: statusForResult(result),
    verificationData: {
      configured: result.configured,
      dnsRecords: result.dnsRecords,
      verification: result.verification,
      error: result.error,
    },
  });
}

export async function removeCustomDomain(hostname: string) {
  const normalized = normalizeForVercel(hostname);
  await createVercelDomainClient().removeProjectDomain(normalized);
  await deleteDomain(normalized);
}
