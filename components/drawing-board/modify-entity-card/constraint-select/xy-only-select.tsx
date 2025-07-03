import { ConstraintType, Constraint } from "../../lib/types";
import { Select } from "@/components/ui/select";
import NumberInput from "@/components/number-input";
import { structuralToScreenY, screenToStructuralY } from "../../lib/coordinate-conversion";

const constraintTypeOptions = [
  { label: "x", value: ConstraintType.X },
  { label: "y", value: ConstraintType.Y },
];

export type ConstraintSelectProps = {
  constraint: Constraint;
  setConstraint: (constraint: Constraint) => void;
  onEnter?: () => void;
  min?: number;
  max?: number;
  disabledConstraintTypes?: ConstraintType[];
  currentX?: number;
  currentY?: number;
};

const ConstraintSelect: React.FC<ConstraintSelectProps> = ({
  constraint,
  setConstraint,
  onEnter,
  min,
  max,
  disabledConstraintTypes = [],
  currentX,
  currentY,
}) => {
  const availableOptions = constraintTypeOptions.filter(
    option => !disabledConstraintTypes.includes(option.value as ConstraintType)
  );

  const isCurrentTypeDisabled = disabledConstraintTypes.includes(constraint.type);
  const isInputDisabled = isCurrentTypeDisabled;
  // Get the correct value to display based on constraint type
  const getDisplayValue = () => {
    if (constraint.type === ConstraintType.X && currentX !== undefined) {
      return currentX;
    }
    if (constraint.type === ConstraintType.Y && currentY !== undefined) {
      // Convert structural Y to screen Y for display
      return structuralToScreenY(currentY);
    }
    // For constraint.value, also convert if it's Y type
    if (constraint.type === ConstraintType.Y) {
      return structuralToScreenY(constraint.value);
    }
    return constraint.value;
  };

  const displayValue = getDisplayValue();
  return (
    <div className="flex items-center gap-1">
      <Select
        className="w-12 h-8"
        value={constraint.type}        onChange={(value) => {
          const newType = value as ConstraintType;
          // When switching constraint type, use the current coordinate value
          let newValue = constraint.value;
          if (newType === ConstraintType.X && currentX !== undefined) {
            newValue = currentX;
          } else if (newType === ConstraintType.Y && currentY !== undefined) {
            // Keep currentY as structural coordinate since it's passed that way
            newValue = currentY;
          }
          
          setConstraint({
            ...constraint,
            type: newType,
            value: newValue,
          });
        }}
        options={availableOptions}
      />
      <NumberInput
        className="h-8"
        value={displayValue}        onChange={(value) =>
          value !== undefined &&
          !isInputDisabled &&
          setConstraint({
            ...constraint,
            // Convert screen Y back to structural Y when saving
            value: constraint.type === ConstraintType.Y ? screenToStructuralY(value) : value,
          })
        }
        onEnter={onEnter}
        min={min}
        max={max}
        disabled={isInputDisabled}
      />
    </div>
  );
};

export default ConstraintSelect;
