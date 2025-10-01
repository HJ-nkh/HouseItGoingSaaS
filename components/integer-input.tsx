import React, { useEffect, useState } from "react";

type IntegerInputProps = {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

const IntegerInput: React.FC<IntegerInputProps> = ({
  value,
  onChange,
  min = 1,
  max,
  placeholder,
  className,
  disabled = false,
}) => {
  const [internal, setInternal] = useState<string>(
    value !== undefined ? String(Math.trunc(value)) : ""
  );

  useEffect(() => {
    setInternal(value !== undefined ? String(Math.trunc(value)) : "");
  }, [value]);

  const parseAndClamp = (text: string): number | undefined => {
    if (text.trim() === "") return undefined;
    const n = parseInt(text, 10);
    if (Number.isNaN(n)) return undefined;
    let out = n;
    if (min !== undefined && out < min) out = min;
    if (max !== undefined && out > max) out = max;
    return out;
  };

  const bump = (delta: number) => {
    const current = parseAndClamp(internal) ?? min ?? 1;
    let next = current + delta;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    setInternal(String(next));
    onChange(next);
  };

  return (
    <div className={("flex items-center border rounded px-1 py-1 w-full" + (className ? " " + className : ""))}>
      <button
        type="button"
        className="text-gray-600 hover:text-gray-800 px-1 disabled:opacity-40"
        onClick={() => bump(-1)}
        disabled={disabled}
        aria-label="Decrement"
      >
        ▾
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className={"w-full text-center focus-visible:outline-none px-1" + (disabled ? " cursor-not-allowed opacity-60" : "")}
        value={internal}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          const sanitized = e.target.value.replace(/[^0-9]/g, "");
          setInternal(sanitized);
          const parsed = parseAndClamp(sanitized);
          onChange(parsed);
        }}
      />
      <button
        type="button"
        className="text-gray-600 hover:text-gray-800 px-1 disabled:opacity-40"
        onClick={() => bump(+1)}
        disabled={disabled}
        aria-label="Increment"
      >
        ▴
      </button>
    </div>
  );
};

export default IntegerInput;
