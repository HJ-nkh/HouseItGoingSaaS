import { EntitySet } from "./lib/reduce-history";
import {
  Action,
  DrawingState,
  Entity,
  PointLoad,
  ActionType,
  DistributedLoad,
  MomentLoad,
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
  addAction: (action: Action) => void;
  svgRef: SVGSVGElement | null;
  entitySet: EntitySet;
};

const AddEntityCard: React.FC<AddEntityCardProps> = ({
  state,
  setState,
  addAction,
  svgRef,
  entitySet,
}) => {
  if (!state.modifyingEntity) {
    return null;
  }

  switch (state.modifyingEntity.type) {    case Entity.PointLoad: {
      const load = state.modifyingEntity.pointLoad as PointLoad;
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
        >          <ModifyPointLoadCard
            entitySet={entitySet}
            load={load}
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
              const id = `pl-${state.nextPointLoadNumber}`;
              load.id = id;

              addAction({
                type: ActionType.Create,
                entity: Entity.PointLoad,
                value: { id, pointLoad: load },
              });
              setState((s) => ({
                ...s,
                nextPointLoadNumber: state.nextPointLoadNumber + 1,
                modifyingEntity: null,
              }));
            }}
            onClose={() => setState((s) => ({ ...s, modifyingEntity: null }))}
          />
        </div>
      );
    }

    case Entity.DistributedLoad: {
      const load = state.modifyingEntity.distributedLoad as DistributedLoad;
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
        >          <ModifyDistributedLoadCard
            load={load}
            entitySet={entitySet}
            onChange={(load) =>
              setState((s) => ({
                ...s,
                modifyingEntity: {
                  type: Entity.DistributedLoad,
                  distributedLoad: load,
                },
              }))
            }            onSubmit={() => {
              const id = `dl-${state.nextDistributedLoadNumber}`;
              load.id = id;

              addAction({
                type: ActionType.Create,
                entity: Entity.DistributedLoad,
                value: { id, distributedLoad: load },
              });
              setState((s) => ({
                ...s,
                nextDistributedLoadNumber: state.nextDistributedLoadNumber + 1,
                modifyingEntity: null,
              }));
            }}
            onClose={() => setState((s) => ({ ...s, modifyingEntity: null }))}
          />
        </div>
      );
    }    case Entity.MomentLoad: {
      const load = state.modifyingEntity.momentLoad as MomentLoad;

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
        >          <ModifyMomentLoadCard
            load={load}
            entitySet={entitySet}
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
              const id = `ml-${state.nextMomentLoadNumber}`;
              load.id = id;

              addAction({
                type: ActionType.Create,
                entity: Entity.MomentLoad,
                value: { id, momentLoad: load },
              });
              setState((s) => ({
                ...s,
                nextMomentLoadNumber: state.nextMomentLoadNumber + 1,
                modifyingEntity: null,
              }));
            }}
            onClose={() => setState((s) => ({ ...s, modifyingEntity: null }))}
          />
        </div>
      );
    }
    default:
      return null;
  }
};

export default AddEntityCard;
