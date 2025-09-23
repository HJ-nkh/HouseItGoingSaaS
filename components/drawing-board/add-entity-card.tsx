import { EntitySet } from "./lib/reduce-history";
import {
  Action,
  DrawingState,
  Entity,
  PointLoad,
  ActionType,
  DistributedLoad,
  MomentLoad,
  WindCalculatorSettings,
} from "./lib/types";
import { fromSvgCoordinates } from "./lib/svg-coordinates";
import ModifyPointLoadCard from "./modify-entity-card/modify-point-load-card";
import {
  resolveDistributedLoadPosition,
  resolveMomentLoadPosition,
  resolvePointLoadPosition,
} from "./lib/reduce-history/resolve-position";
import ModifyDistributedLoadCard from "./modify-entity-card/modify-distributed-load-card";
import ModifyMomentLoadCard from "./modify-entity-card/modify-moment-load-card";
import { calculateCardPosition, getCardTypeFromEntity } from "./lib/card-positioning";

type AddEntityCardProps = {
  state: DrawingState;
  setState: React.Dispatch<React.SetStateAction<DrawingState>>;
  addAction: (action: Action | Action[]) => void;
  svgRef: SVGSVGElement | null;
  entitySet: EntitySet;
  windCalculatorSettings?: WindCalculatorSettings;
  onWindCalculatorSettingsChange?: (settings: Partial<WindCalculatorSettings>) => void;
};

const AddEntityCard: React.FC<AddEntityCardProps> = ({
  state,
  setState,
  addAction,
  svgRef,
  entitySet,
  windCalculatorSettings,
  onWindCalculatorSettingsChange,
}) => {
  if (!state.modifyingEntity) {
    return null;
  }

  switch (state.modifyingEntity.type) {    case Entity.PointLoad: {
      const load = state.modifyingEntity.pointLoad as PointLoad;
    const multiTargets = Object.keys(state.pendingLoadTargets || {});
      const point = resolvePointLoadPosition(
        load,
        entitySet.nodes,
        entitySet.members
      ).resolved;
      
      const { clientX, clientY } = fromSvgCoordinates(point, svgRef);

      return (
        <div
          className="absolute"
          style={calculateCardPosition(
            clientX,
            clientY,
            getCardTypeFromEntity('PointLoad', true)
          )}
    >
          {multiTargets.length > 1 && (
            <div className="absolute -top-2 -right-2 z-50 text-xs bg-blue-600 text-white px-2 py-0.5 rounded shadow">
              {multiTargets.length} valgt
            </div>
          )}
          <ModifyPointLoadCard
            entitySet={entitySet}
            load={load}
      hideCoordinateInputs={multiTargets.length > 1}
            onChange={(load) =>
              setState((s) => ({
                ...s,
                modifyingEntity: {
                  type: Entity.PointLoad,
                  pointLoad: load as PointLoad,
                },
              }))
            }
            onSubmit={() => {
              const targets = multiTargets.length > 0 ? multiTargets : [load.onNode?.id || load.onMember?.id!];
              const actions: Action[] = [];
              let next = state.nextPointLoadNumber;
              for (const tid of targets) {
                const id = `pl-${next++}`;
                const base = { ...load, id } as PointLoad;
                const pending = state.pendingLoadTargets[tid];
                const applied: PointLoad = pending?.onNode
                  ? { ...base, onNode: { id: pending.onNode.id }, onMember: undefined }
                  : { ...base, onMember: { ...(pending?.onMember as any) }, onNode: undefined };
                actions.push({
                  type: ActionType.Create,
                  entity: Entity.PointLoad,
                  value: { id, pointLoad: applied },
                });
              }
              if (actions.length === 0) return;
              addAction(actions);
              setState((s) => ({
                ...s,
                nextPointLoadNumber: next,
                modifyingEntity: null,
                pendingLoadTargets: {},
                selectedIds: [],
              }));
            }}
            onClose={() => setState((s) => ({ ...s, modifyingEntity: null, pendingLoadTargets: {}, selectedIds: [] }))}
          />
        </div>
      );
    }

    case Entity.DistributedLoad: {
  const load = state.modifyingEntity.distributedLoad as DistributedLoad;
  const multiTargets = Object.keys(state.pendingLoadTargets || {});
      const { point1, point2 } = resolveDistributedLoadPosition(
        load,
        entitySet.nodes,
        entitySet.members
      ).resolved;

      const point = {
        x: (point2.x + point1.x) / 2,
        y: (point2.y + point1.y) / 2,
      };      const { clientX, clientY } = fromSvgCoordinates(point, svgRef);

      return (
        <div
          className="absolute"
          style={calculateCardPosition(
            clientX,
            clientY,
            getCardTypeFromEntity('DistributedLoad', true)
          )}
    >
          {multiTargets.length > 1 && (
            <div className="absolute -top-2 -right-2 z-50 text-xs bg-blue-600 text-white px-2 py-0.5 rounded shadow">
              {multiTargets.length} valgt
            </div>
          )}
          <ModifyDistributedLoadCard
            load={load}
            entitySet={entitySet}
      hideCoordinateInputs={multiTargets.length > 1}
            windCalculatorSettings={windCalculatorSettings}
            onWindCalculatorSettingsChange={onWindCalculatorSettingsChange}
            onChange={(load) =>
              setState((s) => ({
                ...s,
                modifyingEntity: {
                  type: Entity.DistributedLoad,
                  distributedLoad: load,
                },
              }))
            }
            onSubmit={() => {
              const targets = multiTargets.length > 0 ? multiTargets : [load.onMember.id];
              const actions: Action[] = [];
              let next = state.nextDistributedLoadNumber;
              for (const tid of targets) {
                const id = `dl-${next++}`;
                const pending = state.pendingLoadTargets[tid];
                const targetMember = pending?.onMember || load.onMember;
                const applied: DistributedLoad = {
                  ...load,
                  id,
                  onMember: {
                    id: targetMember.id,
                    constraintStart: targetMember.constraintStart ?? load.onMember.constraintStart,
                    constraintEnd: targetMember.constraintEnd ?? load.onMember.constraintEnd,
                  },
                };
                actions.push({
                  type: ActionType.Create,
                  entity: Entity.DistributedLoad,
                  value: { id, distributedLoad: applied },
                });
              }
              if (actions.length === 0) return;
              addAction(actions);
              setState((s) => ({
                ...s,
                nextDistributedLoadNumber: next,
                modifyingEntity: null,
                pendingLoadTargets: {},
                selectedIds: [],
              }));
            }}
            onClose={() => setState((s) => ({ ...s, modifyingEntity: null, pendingLoadTargets: {}, selectedIds: [] }))}
          />
        </div>
      );
    }    case Entity.MomentLoad: {
      const load = state.modifyingEntity.momentLoad as MomentLoad;
      const multiTargets = Object.keys(state.pendingLoadTargets || {});

      const point = resolveMomentLoadPosition(
        load,
        entitySet.nodes,
        entitySet.members
      ).resolved;const { clientX, clientY } = fromSvgCoordinates(point, svgRef);

      return (
        <div
          className="absolute"
          style={calculateCardPosition(
            clientX,
            clientY,
            getCardTypeFromEntity('MomentLoad', true)
          )}
    >
          {multiTargets.length > 1 && (
            <div className="absolute -top-2 -right-2 z-50 text-xs bg-blue-600 text-white px-2 py-0.5 rounded shadow">
              {multiTargets.length} valgt
            </div>
          )}
          <ModifyMomentLoadCard
            load={load}
            entitySet={entitySet}
      hideCoordinateInputs={multiTargets.length > 1}
            onChange={(load) =>
              setState((s) => ({
                ...s,
                modifyingEntity: {
                  type: Entity.MomentLoad,
                  momentLoad: load,
                },
              }))
            }
            onSubmit={() => {
              const targets = multiTargets.length > 0 ? multiTargets : [load.onNode?.id || load.onMember?.id!];
              const actions: Action[] = [];
              let next = state.nextMomentLoadNumber;
              for (const tid of targets) {
                const id = `ml-${next++}`;
                const base = { ...load, id } as MomentLoad;
                const pending = state.pendingLoadTargets[tid];
                const applied: MomentLoad = pending?.onNode
                  ? { ...base, onNode: { id: pending.onNode.id }, onMember: undefined }
                  : { ...base, onMember: { ...(pending?.onMember as any) }, onNode: undefined };
                actions.push({
                  type: ActionType.Create,
                  entity: Entity.MomentLoad,
                  value: { id, momentLoad: applied },
                });
              }
              if (actions.length === 0) return;
              addAction(actions);
              setState((s) => ({
                ...s,
                nextMomentLoadNumber: next,
                modifyingEntity: null,
                pendingLoadTargets: {},
                selectedIds: [],
              }));
            }}
            onClose={() => setState((s) => ({ ...s, modifyingEntity: null, pendingLoadTargets: {}, selectedIds: [] }))}
          />
        </div>
      );
    }
    default:
      return null;
  }
};

export default AddEntityCard;
