"use client";

import Link from "next/link";
import { useState } from "react";
import { DepoBadge } from "@/components/depo-icon";
import { DepoForm } from "@/components/forms/depo-form";
import { deleteDepo } from "@/lib/actions/depos";
import { depoKindLabel } from "@/lib/depos";
import type { DepoWithBalance } from "@/lib/queries/depos";

function formatCurrency(value: number, currency: string) {
  const sign = value < 0 ? "-" : "";
  return `${sign}${currency}${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DepoList({
  depos,
  currency,
  activeDepoId,
}: {
  depos: DepoWithBalance[];
  currency: string;
  activeDepoId?: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col">
        {depos.map((depo) =>
          editingId === depo.id ? (
            <li key={depo.id} className="depo-row-edit">
              <DepoForm depo={depo} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </li>
          ) : (
            <li key={depo.id} className={`depo-row ${activeDepoId === depo.id ? "is-active" : ""}`}>
              <Link
                href={activeDepoId === depo.id ? "/dashboard/transactions" : `/dashboard/transactions?depo=${depo.id}`}
                className="depo-row-main"
                scroll={false}
                title={activeDepoId === depo.id ? "Show all transactions" : `Show ${depo.name} transactions`}
              >
                <DepoBadge icon={depo.icon} color={depo.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[color:var(--foreground)]">{depo.name}</span>
                  <span className="block text-[11px] text-[color:var(--muted-soft)]">{depoKindLabel(depo.kind)}</span>
                </span>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    depo.balance < 0 ? "text-[color:var(--status-critical)]" : "text-[color:var(--foreground)]"
                  }`}
                >
                  {formatCurrency(depo.balance, currency)}
                </span>
              </Link>
              <div className="depo-row-actions">
                <button type="button" onClick={() => setEditingId(depo.id)} className="depo-link">
                  Edit
                </button>
                <button
                  type="button"
                  className="depo-link depo-link-danger"
                  onClick={async () => {
                    if (confirm(`Remove "${depo.name}"? Its past transactions are kept.`)) await deleteDepo(depo.id);
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      {adding || depos.length === 0 ? (
        <div className="depo-row-edit">
          <DepoForm
            onDone={() => setAdding(false)}
            onCancel={depos.length > 0 ? () => setAdding(false) : undefined}
          />
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="depo-add">
          <span aria-hidden="true">+</span> Add a depo
        </button>
      )}
    </div>
  );
}
