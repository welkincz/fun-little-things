import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatDollars, formatGrouped, formatRate } from "../format";
import { parseAmount, parsePercent } from "../lib/mortgage/money";
import { stepBy, stepPage } from "../rangeStep";

export function DecimalField({
  id,
  value,
  format,
  parse,
  min,
  max,
  minLabel,
  maxLabel,
  onCommit,
  prefix,
  suffix,
  widthClass,
  describedBy,
  invalid,
  optional = false,
  invalidMessage = "Enter a number.",
  ariaLabel,
}: {
  id: string;
  value: number | null;
  format: (value: number) => string;
  parse: (raw: string) => number | null;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  onCommit: (value: number | null) => void;
  prefix?: string;
  suffix?: string;
  widthClass?: string;
  describedBy?: string;
  invalid?: boolean;
  optional?: boolean;
  invalidMessage?: string;
  ariaLabel?: string;
}) {
  const valueText = value == null ? "" : format(value);
  const [text, setText] = useState(valueText);
  const [note, setNote] = useState<string | null>(null);
  const dirty = useRef(false);
  const noteId = note ? `${id}-note` : undefined;
  const described = [describedBy, noteId].filter(Boolean).join(" ") || undefined;

  useEffect(() => {
    if (!dirty.current) setText(valueText);
  }, [valueText]);

  function commit(raw: string) {
    const edited = dirty.current;
    dirty.current = false;
    // A lossy display (6.875 shown as 6.9) must not be parsed back on blur.
    if (!edited) {
      setText(valueText);
      return;
    }
    if (optional && raw.trim() === "") {
      setNote(null);
      setText("");
      if (value != null) onCommit(null);
      return;
    }
    const parsed = parse(raw);
    if (parsed == null || !Number.isFinite(parsed)) {
      setNote(invalidMessage);
      setText(valueText);
      return;
    }
    if (parsed < min) {
      setNote(`Minimum is ${minLabel}.`);
      setText(format(min));
      onCommit(min);
      return;
    }
    if (parsed > max) {
      setNote(`Maximum is ${maxLabel}.`);
      setText(format(max));
      onCommit(max);
      return;
    }
    setNote(null);
    setText(format(parsed));
    if (value == null || Math.abs(parsed - value) > 1e-6) onCommit(parsed);
  }

  return (
    <div className="num-wrap">
      <div className={widthClass ? `num ${widthClass}` : "num"}>
        {prefix ? (
          <span className="num-affix" aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          aria-label={ariaLabel}
          value={text}
          aria-invalid={invalid || note ? true : undefined}
          aria-describedby={described}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            dirty.current = true;
            setNote(null);
            setText(event.target.value);
          }}
          onBlur={() => commit(text)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
        {suffix ? (
          <span className="num-affix" aria-hidden="true">
            {suffix}
          </span>
        ) : null}
      </div>
      {note ? (
        <p className="clamp-note" id={noteId} role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}

export function AmountField({
  id,
  label,
  value,
  onValue,
  optional = false,
  invalid,
}: {
  id: string;
  label: string;
  value: number | null;
  onValue: (value: number | null) => void;
  optional?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="detail-field">
      <label htmlFor={id}>{label}</label>
      <DecimalField
        id={id}
        value={value}
        optional={optional}
        format={formatGrouped}
        parse={parseAmount}
        min={0}
        max={100_000_000}
        minLabel={formatDollars(0)}
        maxLabel={formatDollars(100_000_000)}
        prefix="$"
        onCommit={onValue}
        invalid={invalid}
      />
    </div>
  );
}

export function RateField({
  id,
  label,
  value,
  onValue,
  optional = false,
  max = 30,
}: {
  id: string;
  label: string;
  value: number | null;
  onValue: (value: number | null) => void;
  optional?: boolean;
  max?: number;
}) {
  return (
    <div className="detail-field">
      <label htmlFor={id}>{label}</label>
      <DecimalField
        id={id}
        value={value}
        optional={optional}
        format={formatRate}
        parse={(raw) => {
          const parsed = parsePercent(raw);
          if (parsed == null) return null;
          return Math.round(parsed * 100) / 100;
        }}
        min={0}
        max={max}
        minLabel="0%"
        maxLabel={`${max}%`}
        suffix="%"
        onCommit={onValue}
      />
    </div>
  );
}

export function RangeControl({
  label,
  min,
  max,
  step,
  value,
  ariaValueText,
  describedBy,
  jumpRef,
  onValue,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  ariaValueText: string;
  describedBy?: string;
  jumpRef: { current: boolean };
  onValue: (value: number) => void;
}) {
  const pointer = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const display = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

  function move(next: number) {
    valueRef.current = next;
    onValue(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const current = valueRef.current;
    let next: number | null = null;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      next = stepBy(current, event.shiftKey ? 10 : 1, step, min, max);
    } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      next = stepBy(current, event.shiftKey ? -10 : -1, step, min, max);
    } else if (event.key === "PageUp") {
      next = stepPage(current, 1, step, min, max);
    } else if (event.key === "PageDown") {
      next = stepPage(current, -1, step, min, max);
    }
    if (next == null) return;
    event.preventDefault();
    move(next);
  }

  return (
    <input
      className="range"
      type="range"
      min={min}
      max={max}
      step={step}
      value={display}
      aria-label={label}
      aria-valuetext={ariaValueText}
      aria-describedby={describedBy}
      onPointerDown={() => {
        pointer.current = true;
        const end = () => {
          pointer.current = false;
          window.removeEventListener("pointerup", end);
          window.removeEventListener("pointercancel", end);
        };
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
      }}
      onChange={(event) => {
        if (pointer.current) jumpRef.current = true;
        move(Number(event.target.value));
      }}
      onKeyDown={onKeyDown}
    />
  );
}

export function Segmented<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: T;
  options: { id: T; label: string; title?: string }[];
  onChange: (value: T) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="segment" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const checked = option.id === value;
        const nameText = option.title ?? option.label;
        return (
          <label key={option.id} title={option.title}>
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={checked}
              aria-label={nameText}
              onChange={() => onChange(option.id)}
            />
            {checked ? (
              <motion.span
                layoutId={reduced ? undefined : `segment-${name}`}
                className="segment-mark"
                transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              />
            ) : null}
            <span className="segment-text">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="choices">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.id}>
          <input
            type="radio"
            name={name}
            value={option.id}
            checked={option.id === value}
            onChange={() => onChange(option.id)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function CheckField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function FieldBlock({
  label,
  htmlFor,
  control,
  slider,
  extra,
}: {
  label: string;
  htmlFor: string;
  control: ReactNode;
  slider: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="slider-field">
      <div className="field-head">
        <label htmlFor={htmlFor}>{label}</label>
        {control}
      </div>
      {slider}
      {extra}
    </div>
  );
}
