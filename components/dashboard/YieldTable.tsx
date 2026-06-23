"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { YieldPool } from "@/types/metrics";
import { formatPercent, formatUsd } from "@/lib/format";

export function YieldTable({ pools }: { pools: YieldPool[] }) {
  const [query, setQuery] = useState("");
  const [stableOnly, setStableOnly] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pools.filter((pool) => {
      if (stableOnly && !pool.stablecoin) return false;
      if (!q) return true;
      return [pool.symbol, pool.chain, pool.project].some((value) =>
        value.toLowerCase().includes(q),
      );
    });
  }, [pools, query, stableOnly]);

  const table = useReactTable({
    data: rows,
    columns: [
      { accessorKey: "symbol", header: "Pool" },
      { accessorKey: "chain", header: "Chain" },
      {
        accessorKey: "tvlUsd",
        header: "TVL",
        cell: (info) => formatUsd(info.getValue<number | null>()),
      },
      {
        accessorKey: "apyBase",
        header: "Base APY",
        cell: (info) => formatPercent(info.getValue<number | null>()),
      },
      {
        accessorKey: "apyReward",
        header: "Reward APY",
        cell: (info) => formatPercent(info.getValue<number | null>()),
      },
      {
        accessorKey: "apy",
        header: "Total APY",
        cell: (info) => formatPercent(info.getValue<number | null>()),
      },
    ],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { sorting: [{ id: "tvlUsd", desc: true }] },
  });

  if (pools.length === 0) return null;

  return (
    <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap justify-between gap-2.5">
        <div>
          <p className="m-0 text-[13px] font-semibold text-[var(--muted)]">Pools</p>
          <h2 className="mb-0 mt-1.5 text-2xl">Yield opportunities</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Search yield pools"
            className="min-h-[38px] min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-[13px] text-[var(--text)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pools"
            value={query}
          />
          <label className="inline-flex min-h-[38px] items-center gap-[7px] rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-[13px] text-[var(--muted)]">
            <input
              checked={stableOnly}
              onChange={(event) => setStableOnly(event.target.checked)}
              type="checkbox"
            />
            Stablecoin only
          </label>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse text-[13px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    className="cursor-pointer px-2 py-[9px] text-left text-[var(--muted)]"
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table
              .getRowModel()
              .rows.slice(0, 20)
              .map((row) => (
                <tr className="border-t border-[var(--border)]" key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td className="whitespace-nowrap px-2 py-2.5" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
