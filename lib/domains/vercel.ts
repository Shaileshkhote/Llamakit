import { env } from "@/lib/env";
import { createDomain, getDomain, updateDomain } from "@/lib/tenancy/store";
import type { Tenant, TenantDomain } from "@/types/tenant";

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
  verified?: boolean;
  verification?: Array<Record<string, unknown>>;
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

function resultFromPayload(hostname: string, payload: VercelDomainResponse): VercelDomainResult {
  const verification = verificationFromVercel(payload.verification);
  return {
    hostname: payload.name || hostname,
    status: payload.verified ? "verified" : "pending",
    verification,
    error: payloadError(payload),
  };
}

function recommendedCname(result: VercelDomainResult) {
  return result.verification.find((record) => record.type === "cname" && record.value)?.value;
}

class RealVercelDomainClient implements VercelDomainClient {
  constructor(private readonly config: Required<Pick<VercelApiConfig, "token" | "projectId">> & Pick<VercelApiConfig, "teamId">) {}

  async addProjectDomain(hostname: string): Promise<VercelDomainResult> {
    const payload = await this.request<VercelDomainResponse>("/domains", {
      method: "POST",
      body: JSON.stringify({ name: hostname }),
    });
    return resultFromPayload(hostname, payload);
  }

  async removeProjectDomain(hostname: string): Promise<void> {
    await this.request(`/domains/${encodeURIComponent(hostname)}`, { method: "DELETE" });
  }

  async getProjectDomain(hostname: string): Promise<VercelDomainResult> {
    const payload = await this.request<VercelDomainResponse>(`/domains/${encodeURIComponent(hostname)}`, { method: "GET" });
    return resultFromPayload(hostname, payload);
  }

  async verifyProjectDomain(hostname: string): Promise<VercelDomainResult> {
    const payload = await this.request<VercelDomainResponse>(`/domains/${encodeURIComponent(hostname)}/verify`, { method: "POST" });
    return resultFromPayload(hostname, payload);
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
      verification: [
        {
          type: "cname",
          name: dnsHostLabel(hostname),
          value: "cname.vercel-dns.com",
          reason: "Fallback CNAME. The live Vercel API can return a domain-specific target.",
        },
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

function dnsHostLabel(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(0, -2).join(".");
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

export async function addCustomDomain(tenant: Tenant, hostname: string): Promise<TenantDomain> {
  const normalized = normalizeForVercel(hostname);
  const result = await createVercelDomainClient().addProjectDomain(normalized);
  const cname = recommendedCname(result);

  return await createDomain({
    tenantId: tenant.id,
    hostname: result.hostname,
    type: "custom",
    status: result.status === "verified" ? "active" : result.status === "error" ? "failed" : "verifying",
    verificationData: {
      verification: result.verification,
      error: result.error,
      cname,
    },
  });
}

export async function refreshCustomDomain(hostname: string) {
  const existing = await getDomain(normalizeForVercel(hostname));
  if (!existing) return null;

  const result = await createVercelDomainClient().verifyProjectDomain(existing.hostname);
  const cname = recommendedCname(result);
  return await updateDomain(existing.hostname, {
    status: result.status === "verified" ? "active" : result.status === "error" ? "failed" : "verifying",
    verificationData: {
      verification: result.verification,
      error: result.error,
      cname,
    },
  });
}
