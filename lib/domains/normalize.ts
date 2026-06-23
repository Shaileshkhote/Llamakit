const HOSTNAME_RE = /^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;

export function normalizeHostname(input: string): string {
  const trimmed = input.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const host = withoutProtocol.split("/")[0]?.replace(/\.$/, "") || "";

  if (!HOSTNAME_RE.test(host)) {
    throw new Error("Hostname must be a valid fully qualified domain name.");
  }

  return host;
}
