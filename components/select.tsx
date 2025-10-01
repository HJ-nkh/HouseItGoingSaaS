import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import type { ReactNode } from "react";

type SelectOption = {
  label: ReactNode;
  value: string;
  selectedLabel?: ReactNode;
};

type SelectProps = {
  options: SelectOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  className?: string;
  placeholder?: string;
  emptyPlaceholder?: string;
};

// TODO?: Implement select groups
const SelectComponent: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  className,
  placeholder,
  emptyPlaceholder = null,
}) => {
  if (options.length === 0) {
    return emptyPlaceholder;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(({ label, value }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export { SelectComponent as Select, type SelectOption };
