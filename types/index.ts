export type NavItem = {
  label: string;
  href: `/${string}` | `#${string}`;
};

export type MetricTone = "neutral" | "positive" | "warning";

export type MetricCard = {
  label: string;
  value: string;
  change: string;
  tone: MetricTone;
};
