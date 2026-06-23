function humanizeKey(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function cleanText(value: string) {
  const text = value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text || text.includes("[object Object]")) return null;
  return text;
}

function uniqueLines(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeMethodologyText(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value === "string") {
    return cleanText(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return cleanText(String(value));
  }

  if (Array.isArray(value)) {
    const lines = uniqueLines(
      value.flatMap((item) => normalizeMethodologyText(item)?.split("\n") ?? []),
    );
    return cleanText(lines.join("\n"));
  }

  if (typeof value === "object") {
    const lines = Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      const normalized = normalizeMethodologyText(item);
      if (!normalized) return [];

      const label = humanizeKey(key);
      if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
        return [`${label}: ${normalized}`];
      }

      return normalized.split("\n").map((line) => `${label}: ${line}`);
    });

    return cleanText(uniqueLines(lines).join("\n"));
  }

  return null;
}

export function splitSourceUrls(value: string | null | undefined) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/\n+|,\s*(?=https?:\/\/)/)
        .map((item) => item.trim())
        .filter((item) => {
          try {
            const url = new URL(item);
            return url.protocol === "https:" || url.protocol === "http:";
          } catch {
            return false;
          }
        }),
    ),
  );
}
