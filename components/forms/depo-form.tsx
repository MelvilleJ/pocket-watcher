"use client";

import { useActionState, useState } from "react";
import { createDepo, updateDepo } from "@/lib/actions/depos";
import { DepoIcon } from "@/components/depo-icon";
import {
  DEFAULT_ICON_FOR_KIND,
  DEPO_COLORS,
  DEPO_ICONS,
  DEPO_KIND_LABELS,
  DEPO_KIND_VALUES,
  type DepoKind,
} from "@/lib/depos";

type DepoValues = {
  id: string;
  name: string;
  kind: string;
  color: string;
  icon: string;
  openingBalance: number;
};

export function DepoForm({
  depo,
  onDone,
  onCancel,
}: {
  depo?: DepoValues;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(depo?.name ?? "");
  const [kind, setKind] = useState<DepoKind>((depo?.kind as DepoKind) ?? "bank");
  const [color, setColor] = useState(depo?.color ?? DEPO_COLORS[5]);
  const [icon, setIcon] = useState(depo?.icon ?? DEFAULT_ICON_FOR_KIND.bank);
  const [iconTouched, setIconTouched] = useState(Boolean(depo));
  const [state, action, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof createDepo>>, formData: FormData) => {
      const result = await (depo ? updateDepo : createDepo)(prev, formData);
      if (!result?.error) {
        if (!depo) {
          setName("");
          setIconTouched(false);
        }
        onDone?.();
      }
      return result;
    },
    undefined
  );

  const idPrefix = depo?.id ?? "new";

  return (
    <form action={action} className="depo-form" style={{ "--depo-color": color } as React.CSSProperties}>
      {depo && <input type="hidden" name="id" value={depo.id} />}
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="icon" value={icon} />

      <div className="depo-form-preview">
        <span className="depo-badge depo-badge-lg">
          <DepoIcon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Republic Bank"
            aria-label="Depo name"
            required
            maxLength={60}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="txn-field">
          <span className="txn-label">Type</span>
          <select
            name="kind"
            value={kind}
            onChange={(e) => {
              const next = e.target.value as DepoKind;
              setKind(next);
              if (!iconTouched) setIcon(DEFAULT_ICON_FOR_KIND[next]);
            }}
          >
            {DEPO_KIND_VALUES.map((k) => (
              <option key={k} value={k}>
                {DEPO_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="txn-field">
          <span className="txn-label">Starting balance</span>
          <input
            type="number"
            step="0.01"
            name="openingBalance"
            defaultValue={depo ? depo.openingBalance.toFixed(2) : ""}
            placeholder="0.00"
            inputMode="decimal"
          />
        </label>
      </div>

      <fieldset className="depo-picker">
        <legend className="txn-label">Colour</legend>
        <div className="depo-swatches">
          {DEPO_COLORS.map((c) => (
            <label key={c} className="depo-swatch" style={{ background: c }} title={c}>
              <input
                type="radio"
                name={`${idPrefix}-color-choice`}
                checked={color.toLowerCase() === c}
                onChange={() => setColor(c)}
                className="sr-only"
              />
              <span className="sr-only">{c}</span>
            </label>
          ))}
          <label className="depo-swatch depo-swatch-custom" title="Custom colour">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Custom colour" />
          </label>
        </div>
      </fieldset>

      <fieldset className="depo-picker">
        <legend className="txn-label">Symbol</legend>
        <div className="depo-icons">
          {DEPO_ICONS.map((i) => (
            <label key={i} className="depo-icon-choice" title={i}>
              <input
                type="radio"
                name={`${idPrefix}-icon-choice`}
                checked={icon === i}
                onChange={() => {
                  setIcon(i);
                  setIconTouched(true);
                }}
                className="sr-only"
              />
              <DepoIcon name={i} className="h-[18px] w-[18px]" />
              <span className="sr-only">{i}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state?.error && <p className="text-sm text-[color:var(--status-critical)]">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="depo-submit">
          {pending ? "Saving…" : depo ? "Save changes" : "Add depo"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="depo-cancel">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
