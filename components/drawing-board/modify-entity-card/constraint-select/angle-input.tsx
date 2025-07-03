import { Select, SelectOption } from "@/components/select";
import NumberInput from "@/components/number-input";

type AngleInputProps = {
  value: number | undefined;
  contextNodeId?: string;
  onChange: (v: {
    contextNodeId: string | undefined;
    value: number | undefined;
  }) => void;
  nodeOptions: SelectOption[];
  onEnter?: () => void;
};

const AngleInput: React.FC<AngleInputProps> = ({
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
        unit="deg"
        onEnter={onEnter}
      />
    </div>
  );
};

export default AngleInput;
