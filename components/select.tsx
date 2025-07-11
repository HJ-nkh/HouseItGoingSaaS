import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

type SelectOption = {
  label: string;
  value: string;
  selectedLabel?: string;
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
  const selectedOption: SelectOption | undefined = options.find(
    (option) => option.value === value
  );

  if (options.length === 0) {
    return emptyPlaceholder;
  }

  return (
    <Select value={selectedOption?.value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue>
          {selectedOption?.selectedLabel ||
            selectedOption?.label ||
            placeholder}
        </SelectValue>
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
