import NumberInput from "@/components/number-input";

export type XYCoordinatesInputProps = {
  x: number;
  y: number;
  onChange: (coords: { x: number; y: number }) => void;
  onEnter?: () => void;
};

const XYCoordinatesInput: React.FC<XYCoordinatesInputProps> = ({
  x,
  y,
  onChange,
  onEnter,
}) => {
  // Note: x and y are already in screen coordinates when passed to this component
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="w-4 text-sm font-medium">X:</label>        <NumberInput
          className="h-8"
          value={x}
          onChange={(value) =>
            value !== undefined &&
            onChange({ x: value, y })
          }
          onEnter={onEnter}
          unit="m"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="w-4 text-sm font-medium">Y:</label>        <NumberInput
          className="h-8"
          value={y}
          onChange={(value) =>
            value !== undefined &&
            onChange({ x, y: value })
          }
          onEnter={onEnter}
          unit="m"
        />
      </div>
    </div>
  );
};

export default XYCoordinatesInput;
