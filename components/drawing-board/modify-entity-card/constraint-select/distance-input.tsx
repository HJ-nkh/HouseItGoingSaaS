import { Select, SelectOption } from "@/components/ui/select";
import NumberInput from "@/components/number-input";

type DistanceInputProps = {
  value: number | undefined;
  contextNodeId?: string;
  onChange: (v: {
    contextNodeId: string | undefined;
    value: number | undefined;
  }) => void;
  nodeOptions: SelectOption[];
  onEnter?: () => void;
};

const DistanceInput: React.FC<DistanceInputProps> = ({
  value,
  contextNodeId,
  onChange,
  nodeOptions,
  onEnter,
}) => {
  return (
    <div className="flex items-center gap-1">
      <Select
        className="w-20 h-8"
        options={nodeOptions}
        value={contextNodeId}
        onChange={(id) => onChange({ contextNodeId: id, value })}
        emptyPlaceholder="-"
        placeholder="-"
      />
      <NumberInput
        className="h-8"
        value={value}
        onChange={(value) => onChange({ contextNodeId, value })}
        unit="m"
        onEnter={onEnter}
      />
    </div>
  );
};

export default DistanceInput;
