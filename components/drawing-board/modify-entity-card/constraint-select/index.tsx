import { ConstraintType, Constraint } from "../../lib/types";
import { EntitySet } from "../../lib/reduce-history";
import { Select } from "@/components/select";
import ValueInput from "./value-input";

const constraintTypeOptions = [
  { label: "x", value: ConstraintType.X },
  { label: "y", value: ConstraintType.Y },
  { label: "α", value: ConstraintType.Angle },
  { label: "Member", value: ConstraintType.Member, selectedLabel: "M" },
  { label: "Distance", value: ConstraintType.Distance, selectedLabel: "D" },
];

export type ConstraintSelectProps = {
  constraint: Partial<Constraint>;
  setConstraint: (
    f: (constraint: Partial<Constraint>) => Partial<Constraint>
  ) => void;
  entitySet: EntitySet;
  nodeId: string;
  onEnter?: () => void;
};

const ConstraintSelect: React.FC<ConstraintSelectProps> = (props) => {
  const { constraint, setConstraint } = props;
  return (
    <div className="flex gap-1 items-center">
      <Select
        className="w-16 h-8"
        value={constraint.type}
        onChange={(value) =>
          setConstraint((c) => ({
            ...c,
            type: value as ConstraintType,
            value: undefined,
          }))
        }
        options={constraintTypeOptions}
      />

      <ValueInput {...props} />
    </div>
  );
};

export default ConstraintSelect;
