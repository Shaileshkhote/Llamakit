"use client";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { DashboardData } from "@/types/metrics";
import { formatUsd } from "@/lib/format";

type Row = {
  label: string;
  fees: number | null;
  revenue: number | null;
  holdersRevenue: number | null;
};

export function EconomicsTable({
  compact = false,
  data,
}: {
  compact?: boolean;
  data: DashboardData;
}) {
  const rows: Row[] = [
    {
      label: "24h",
      fees: data.metrics.fees?.total24h ?? null,
      revenue: data.metrics.revenue?.total24h ?? null,
      holdersRevenue: data.metrics.holdersRevenue?.total24h ?? null,
    },
    {
      label: "7d",
      fees: data.metrics.fees?.total7d ?? null,
      revenue: data.metrics.revenue?.total7d ?? null,
      holdersRevenue: data.metrics.holdersRevenue?.total7d ?? null,
    },
    {
      label: "30d",
      fees: data.metrics.fees?.total30d ?? null,
      revenue: data.metrics.revenue?.total30d ?? null,
      holdersRevenue: data.metrics.holdersRevenue?.total30d ?? null,
    },
  ];

  const table = useReactTable({
    data: rows,
    columns: [
      { accessorKey: "label", header: "Period" },
      {
        accessorKey: "fees",
        header: "Fees",
        cell: (info) => formatUsd(info.getValue<number | null>()),
      },
      {
        accessorKey: "revenue",
        header: "Revenue",
        cell: (info) => formatUsd(info.getValue<number | null>()),
      },
      {
        accessorKey: "holdersRevenue",
        header: "Holder Revenue",
        cell: (info) => formatUsd(info.getValue<number | null>()),
      },
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  if (!data.metrics.fees && !data.metrics.revenue && !data.metrics.holdersRevenue) return null;

  return (
    <section
      className={`min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] ${compact ? "p-[18px]" : "p-5"} max-[640px]:p-3.5`}
    >
      <p className="m-0 text-[13px] font-semibold text-[var(--muted)]">Financials</p>
      <h2 className="mb-1 mt-1.5 text-2xl">Protocol economics</h2>
      <p className="mb-3.5 mt-0 text-[13px] text-[var(--muted)]">
        Simplified fee and revenue view. This is not a complete income statement.
      </p>
      <div className="hidden gap-2.5 max-[640px]:grid">
        {rows.map((row) => (
          <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3" key={row.label}>
            <div className="mb-2 flex items-center justify-between">
              <strong>{row.label}</strong>
              <span className="text-xs text-[var(--muted)]">Period</span>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-[13px]">
              <div>
                <dt className="text-[var(--muted)]">Fees</dt>
                <dd className="m-0 mt-1 font-bold">{formatUsd(row.fees)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Rev</dt>
                <dd className="m-0 mt-1 font-bold">{formatUsd(row.revenue)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Holder</dt>
                <dd className="m-0 mt-1 font-bold">{formatUsd(row.holdersRevenue)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <table className="w-full border-collapse text-[13px] max-[640px]:hidden">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th className="px-2 py-[9px] text-left text-[var(--muted)]" key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr className="border-t border-[var(--border)]" key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td className="px-2 py-2.5" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
