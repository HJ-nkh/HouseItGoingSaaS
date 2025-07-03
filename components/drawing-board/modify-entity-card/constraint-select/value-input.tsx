import { Select } from "@/components/select";
import { ConstraintType } from "../../lib/types";
import AngleInput from "./angle-input";
import NumberInput from "@/components/number-input";
import { ConstraintSelectProps } from ".";
import DistanceInput from "./distance-input";

const ValueInput: React.FC<ConstraintSelectProps> = ({
  constraint,
  setConstraint,
  entitySet,
  nodeId,
  onEnter,
}) => {
  switch (constraint.type) {
    case ConstraintType.X:
    case ConstraintType.Y:
      return (        <NumberInput
          className="h-8"
          value={constraint.value}
          onChange={(value) =>
            setConstraint((c) => ({
              ...c,
              value: value,
            }))
          }
          onEnter={onEnter}
        />
      );
    case ConstraintType.Angle: {
      const nodeOptions = Object.values(entitySet.nodes)
        .filter((n) => n.id !== nodeId)
        .map((node) => ({ label: node.id, value: node.id }));
      return (
        <AngleInput
          value={constraint.value}
          contextNodeId={constraint.contextNodeId}          onChange={({ contextNodeId, value }) => {
            setConstraint((c) => ({
              ...c,
              contextNodeId,
              value: value,
            }));
          }}
          nodeOptions={nodeOptions}
          onEnter={onEnter}
        />
      );
    }
    case ConstraintType.Member:
      return (
        <Select
          options={Object.values(entitySet.members).map((member) => ({
            label: member.id,
            value: member.id,
          }))}
          value={constraint.memberId}
          onChange={(id) => setConstraint((c) => ({ ...c, memberId: id }))}
          placeholder="Select a member"
          emptyPlaceholder="No available members"
        />
      );
    case ConstraintType.Distance: {
      const nodeOptions = Object.values(entitySet.nodes)
        .filter((n) => n.id !== nodeId)
        .map((node) => ({ label: node.id, value: node.id }));
      return (
        <DistanceInput
          value={constraint.value}
          contextNodeId={constraint.contextNodeId}          onChange={({ contextNodeId, value }) =>
            setConstraint((c) => ({
              ...c,
              contextNodeId,
              value: value,
            }))
          }
          nodeOptions={nodeOptions}
          onEnter={onEnter}
        />
      );
    }
    default:
      return null;
  }
};

export default ValueInput;
