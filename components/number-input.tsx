import classNames from "classnames";
import { useEffect, useState, ReactNode } from "react";
import { normalizeDecimalSeparator, roundToTwoDecimals } from "@/lib/decimal-utils";

type NumberInputProps = {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  unit?: ReactNode;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  onEnter?: () => void;
  disabled?: boolean;
};

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  unit,
  placeholder,
  className,
  min,
  max,
  onEnter,
  disabled = false,
}) => {
  const [internalValue, setInternalValue] = useState<string>(
    value !== undefined ? value.toString().replace('.', ',') : ""
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    // Only update internal value if not currently editing
    if (!isEditing) {
      setInternalValue(value !== undefined ? value.toString().replace('.', ',') : "");
    }
  }, [value, isEditing]);

  const finishEditing = () => {
    setIsEditing(false);
    // Apply formatting with comma and 2 decimal places when editing finishes
    if (value !== undefined) {
      const rounded = roundToTwoDecimals(value);
      const formatted = rounded.toFixed(2).replace('.', ',');
      setInternalValue(formatted);
      if (rounded !== value) {
        onChange(rounded);
      }
    }
  };

  return (
    <div
      className={classNames(
        "flex items-center border rounded px-2 py-1 flex-1",
        {
          "opacity-50 cursor-not-allowed": disabled,
          "bg-gray-100": disabled,
        },
        className
      )}
    >
      <input
        type="text"
        className={classNames(
          "w-full h-full rounded focus-visible:outline-none px-1",
          {
            "cursor-not-allowed": disabled,
            "bg-transparent": disabled,
          }
        )}
        value={internalValue}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => {
          if (disabled) return;
          setIsEditing(true);
          
          // Allow digits, dots, commas, and minus signs
          const sanitizedValue = e.target.value.replace(/[^0-9-.,]/g, "");
          setInternalValue(sanitizedValue);

          if (sanitizedValue === "") {
            return onChange(undefined);
          }

          // Normalize comma to dot for parsing
          const normalizedValue = normalizeDecimalSeparator(sanitizedValue);

          const hasTrailingDecimal = normalizedValue.endsWith(".");
          const isSlash = normalizedValue === "-";
          const isSlashZero = normalizedValue === "-0";

          if (!hasTrailingDecimal && !isSlash && !isSlashZero) {
            let parsed = parseFloat(normalizedValue);

            // Apply min/max constraints but don't round yet
            if (max !== undefined && parsed > max) {
              parsed = max;
            }

            if (min !== undefined && parsed < min) {
              parsed = min;
            }

            onChange(parsed);
          }
        }}
        onBlur={() => {
          if (disabled) return;
          finishEditing();
        }}
        onKeyUp={(e) => {
          if (disabled) return;
          if (e.key === "Enter") {
            finishEditing();
            onEnter?.();
          }
        }}
      />
      <span className={classNames("text-gray-500", { "opacity-50": disabled })}>
        {unit}
      </span>
    </div>
  );
};

export default NumberInput;
