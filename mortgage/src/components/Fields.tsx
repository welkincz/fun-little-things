import { useEffect, useId, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatGrouped } from "../format";
import { parseAmount, parsePercent } from "../lib/mortgage/money";

export function AmountField({
  id,
  label,
  value,
  onValue,
  hint,
  invalid,
  alert,
  placeholder,
  optional = false,
}: {
  id: string;
  label: string;
  value: number | null;
  onValue: (value: number | null) => void;
  hint?: string;
  invalid?: boolean;
  alert?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  const [text, setText] = useState(value == null ? "" : formatGrouped(value));
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  const hintId = hint ? `${id}-hint` : undefined;
  const alertId = alert ? `${id}-alert` : undefined;
  const describedBy = [hintId, alertId].filter(Boolean).join(" ") || undefined;

  useEffect(() => {
    if (!focused) setText(value == null ? "" : formatGrouped(value));
  }, [focused, value]);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="line-input">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            if (optional && next.trim() === "") {
              onValue(null);
              return;
            }
            const parsed = parseAmount(next);
            if (parsed != null) onValue(parsed);
          }}
        />
        {focused ? (
          <motion.span
            className="field-mark"
            initial={reduced ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.22 }}
          />
        ) : null}
      </div>
      {hint ? (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {alert ? (
        <p className="alert" id={alertId} role="alert">
          {alert}
        </p>
      ) : null}
    </div>
  );
}

export function RateField({
  id,
  label,
  value,
  onValue,
  hint,
  optional = false,
  digits = 2,
}: {
  id: string;
  label: string;
  value: number | null;
  onValue: (value: number | null) => void;
  hint?: string;
  optional?: boolean;
  digits?: number;
}) {
  const shown = (next: number) =>
    new Intl.NumberFormat("en-CA", {
      minimumFractionDigits: Math.min(2, digits),
      maximumFractionDigits: digits,
    }).format(next);
  const [text, setText] = useState(value == null ? "" : shown(value));
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  const hintId = hint ? `${id}-hint` : undefined;

  useEffect(() => {
    if (!focused) setText(value == null ? "" : shown(value));
  }, [focused, value, digits]);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="line-input">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          aria-describedby={hintId}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            if (optional && next.trim() === "") {
              onValue(null);
              return;
            }
            const parsed = parsePercent(next);
            if (parsed != null && parsed <= 30) onValue(parsed);
          }}
        />
        <span className="suffix" aria-hidden="true">
          %
        </span>
        {focused ? (
          <motion.span
            className="field-mark"
            initial={reduced ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
          />
        ) : null}
      </div>
      {hint ? (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  hint,
}: {
  legend: string;
  name: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
}) {
  const reduced = useReducedMotion();
  const hintId = useId();
  return (
    <fieldset className="group tight">
      <legend>{legend}</legend>
      <div className="choices" role="presentation">
        {options.map((option) => {
          const checked = option.id === value;
          return (
            <label key={option.id}>
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={checked}
                aria-describedby={hint ? hintId : undefined}
                onChange={() => onChange(option.id)}
              />
              <span>
                {option.label}
                {checked ? (
                  <motion.span
                    layoutId={reduced ? undefined : `choice-${name}`}
                    className="choice-mark"
                  />
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {hint ? (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}

export function CheckField({
  id,
  label,
  checked,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label className="check" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{label}</span>
      </label>
      {hint ? (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FieldNote({ children }: { children: ReactNode }) {
  return <p className="hint status">{children}</p>;
}
