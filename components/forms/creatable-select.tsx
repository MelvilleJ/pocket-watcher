"use client";

import { useState } from "react";

const ADD_NEW = "__add_new__";

export type SelectOption = { value: string; label?: string };

export function CreatableSelect({
  name,
  options,
  defaultValue = "",
  placeholder,
  addLabel = "Add new…",
  newPlaceholder,
  maxLength = 60,
  required,
  className,
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder: string;
  addLabel?: string;
  newPlaceholder?: string;
  maxLength?: number;
  required?: boolean;
  className?: string;
}) {
  const [adding, setAdding] = useState(false);

  if (adding) {
    return (
      <span className="creatable-select">
        <input
          name={name}
          placeholder={newPlaceholder}
          maxLength={maxLength}
          required={required}
          autoFocus
          className={className}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAdding(false);
          }}
        />
        <button type="button" className="creatable-select-back" onClick={() => setAdding(false)} aria-label="Pick from list">
          ×
        </button>
      </span>
    );
  }

  return (
    <select
      name={name}
      defaultValue={defaultValue}
      required={required}
      className={className}
      onChange={(e) => {
        if (e.target.value === ADD_NEW) setAdding(true);
      }}
    >
      <option value="" disabled={required}>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label ?? o.value}
        </option>
      ))}
      <option value={ADD_NEW}>{addLabel}</option>
    </select>
  );
}
