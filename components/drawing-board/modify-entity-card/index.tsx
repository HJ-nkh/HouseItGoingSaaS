import getEntityType from "../lib/get-entity-type";
import { EntitySet } from "../lib/reduce-history";
import {
  Action,
  ActionType,
  Assembly,
  ConstraintType,
  DrawingState,
  Entity,
  Node,
  WindCalculatorSettings,
} from "../lib/types";
import ModifyPointLoadCard from "./modify-point-load-card";
import ModifyDistributedLoadCard from "./modify-distributed-load-card";
import ModifyNodeCard from "./modify-node-card";
import ModifyMemberCard from "./modify-member-card";
import ModifyMomentLoadCard from "./modify-moment-load-card";
import ModifySupportCard from "./modify-support-card";
import { getLineAngle } from "../lib/geometry";
import getNodeOnMember from "../lib/get-node-on-member";

type ModifyEntityCardProps = {
  entitySet: EntitySet;
  state: DrawingState;
  setState: React.Dispatch<React.SetStateAction<DrawingState>>;
  addAction: (action: Action | Action[]) => void;
  windCalculatorSettings?: WindCalculatorSettings;
  onWindCalculatorSettingsChange?: (settings: Partial<WindCalculatorSettings>) => void;
};

const ModifyEntityCard: React.FC<ModifyEntityCardProps> = ({
  entitySet,
  state,
  setState,
  addAction,
  windCalculatorSettings,
  onWindCalculatorSettingsChange,
}) => {
  if (!state.modifyingEntity) {
    return null;
  }

  const onClose = () =>
    setState((s) => ({ ...s, modifyingEntity: null, selectedIds: [] }));

  switch (state.modifyingEntity.type) {
    case Entity.Node: {
      const node = state.modifyingEntity.node;

      if (!node) {
        return null;
      }

      const dependentMembers = node.dependants
        ?.filter((id) => getEntityType(id) === Entity.Member)
        .map((id) => entitySet.members[id]);

      let assembly: Assembly | undefined = undefined;

      if (dependentMembers && dependentMembers.length > 0) {
        const memberNode = getNodeOnMember(node.id, dependentMembers[0]);
        assembly = memberNode?.assembly;
      }

      return (
        <ModifyNodeCard
          entitySet={entitySet}
          node={node}
          onChange={(node) =>
            setState((s) => ({
              ...s,
              modifyingEntity: { type: Entity.Node, node },
            }))
          }
          onSubmit={(assembly) => {
            const actions: Action[] = [];

            const id = node.id;
            const prevNode = entitySet.nodes[id];

            if (!prevNode) {
              // Node card currently does not support creating
              throw new Error("Cannot update non-existent node");
            }

            actions.push({
              type: ActionType.Update,
              entity: Entity.Node,
              value: { id, node: node as Node, prevNode },
            });

            if (assembly) {
              for (const member of dependentMembers ?? []) {
                const updated = { ...member };

                if (member.node1.id === node.id) {
                  updated.node1 = { ...member.node1, assembly };
                }
                if (member.node2.id === node.id) {
                  updated.node2 = { ...member.node2, assembly };
                }

                actions.push({
                  type: ActionType.Update,
                  entity: Entity.Member,
                  value: {
                    id: member.id,
                    member: updated,
                    prevMember: member,
                  },
                });
              }
            }

            addAction(actions);
            onClose();
          }}
          onClose={onClose}
          onDelete={() => {
            addAction({
              type: ActionType.Delete,
              entity: Entity.Node,
              value: { id: node.id as string },
            });
            onClose();
          }}
          initialAssembly={assembly}
        />
      );
    }
    case Entity.Member: {
      const member = state.modifyingEntity.member;
      const selectedIds = state.selectedIds; // all currently selected member IDs
      if (!member) {
        return null;
      }
      return (
        <ModifyMemberCard
          member={member}
          onChange={(m) =>
            setState((s) => ({
              ...s,
              modifyingEntity: { type: Entity.Member, member: m },
            }))
          }
          onSubmit={(length, updatedMember) => {
            const actions: Action[] = [];

            // apply to each selected member
            for (const id of selectedIds) {
              const prevMember = entitySet.members[id];
              if (!prevMember) {
                continue;
              }

              // if length (distance) changed, update corresponding node
              if (length !== undefined) {
                const line = entitySet.members[id]?.resolved;
                const node = entitySet.nodes[prevMember.node2.id];
                if (line && node) {
                  const angle = getLineAngle(line);
                  const contextNodeId = prevMember.node1.id;
                  const constraint1 = {
                    type: ConstraintType.Distance,
                    value: length,
                    contextNodeId,
                  };
                  const constraint2 = {
                    type: ConstraintType.Angle,
                    value: angle,
                    contextNodeId,
                  };
                  actions.push({
                    type: ActionType.Update,
                    entity: Entity.Node,
                    value: {
                      id: node.id,
                      node: { ...node, constraint1, constraint2 },
                      prevNode: node,
                    },
                  });
                }
              }

              // update memberprops on this member
              actions.push({
                type: ActionType.Update,
                entity: Entity.Member,
                value: {
                  id,
                  member: {
                    ...prevMember,
                    memberprop: updatedMember.memberprop,
                  },
                  prevMember,
                },
              });
            }

            addAction(actions);
            onClose();
          }}
          onClose={onClose}
          onDelete={() => {
            const deletes = selectedIds.map((id) => ({
              type: ActionType.Delete,
              entity: Entity.Member,
              value: { id },
            }));
            addAction(deletes);
            onClose();
          }}
        />
      );
    }
    case Entity.PointLoad: {
      const pointLoad = state.modifyingEntity.pointLoad;
      if (!pointLoad) return null;

      return (
        <ModifyPointLoadCard
          entitySet={entitySet}
          load={pointLoad}
          onChange={(load) =>
            setState((s) => ({
              ...s,
              modifyingEntity: { type: Entity.PointLoad, pointLoad: load },
            }))
          }
          onSubmit={() => {
            const prevPointLoad = entitySet.pointLoads[pointLoad.id];
            addAction({
              type: prevPointLoad ? ActionType.Update : ActionType.Create,
              entity: Entity.PointLoad,
              value: {
                id: pointLoad.id,
                pointLoad,
                prevPointLoad,
              },
            });
            onClose();
          }}
          onClose={onClose}
          onDelete={() => {
            if (entitySet.pointLoads[pointLoad.id]) {
              addAction({
                type: ActionType.Delete,
                entity: Entity.PointLoad,
                value: {
                  id: pointLoad.id as string,
                },
              });
            }
            onClose();
          }}
        />
      );
    }
    case Entity.DistributedLoad: {
      const distributedLoad = state.modifyingEntity.distributedLoad;
      if (!distributedLoad) return null;

      return (
        <ModifyDistributedLoadCard
          load={distributedLoad}
          entitySet={entitySet}
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
          onSubmit={(load) => {
            const prevDistributedLoad = entitySet.distributedLoads[load.id];
            addAction({
              type: prevDistributedLoad ? ActionType.Update : ActionType.Create,
              entity: Entity.DistributedLoad,
              value: {
                id: load.id,
                distributedLoad: load,
                prevDistributedLoad,
              },
            });
            onClose();
          }}
          onClose={onClose}
          onDelete={() => {
            if (entitySet.distributedLoads[distributedLoad.id]) {
              addAction({
                type: ActionType.Delete,
                entity: Entity.DistributedLoad,
                value: {
                  id: distributedLoad.id as string,
                },
              });
            }
            onClose();
          }}
        />
      );
    }
    case Entity.MomentLoad: {
      const momentLoad = state.modifyingEntity.momentLoad;
      if (!momentLoad) {
        return null;
      }

      return (
        <ModifyMomentLoadCard
          load={momentLoad}
          entitySet={entitySet}
          onChange={(load) =>
            setState((s) => ({
              ...s,
              modifyingEntity: { type: Entity.MomentLoad, momentLoad: load },
            }))
          }
          onSubmit={() => {
            const prevMomentLoad = entitySet.momentLoads[momentLoad.id];
            addAction({
              type: prevMomentLoad ? ActionType.Update : ActionType.Create,
              entity: Entity.MomentLoad,
              value: {
                id: momentLoad.id,
                momentLoad,
                prevMomentLoad,
              },
            });
            onClose();
          }}
          onClose={onClose}
          onDelete={() => {
            if (entitySet.momentLoads[momentLoad.id]) {
              addAction({
                type: ActionType.Delete,
                entity: Entity.MomentLoad,
                value: { id: momentLoad.id as string },
              });
            }
            onClose();
          }}
        />
      );
    }

    case Entity.Support: {
      const support = state.modifyingEntity.support;

      if (!support) {
        return null;
      }

      return (
        <ModifySupportCard
          support={support}
          entitySet={entitySet}
          onChange={(support) =>
            setState((s) => ({
              ...s,
              modifyingEntity: { type: Entity.Support, support },
            }))
          }
          onSubmit={(support) => {
            const prevSupport = entitySet.supports[support.id];

            if (!prevSupport) {
              // Support card does not currently support creating
              throw new Error("Cannot update non-existent support");
            }

            addAction({
              type: ActionType.Update,
              entity: Entity.Support,
              value: {
                id: support.id,
                support,
                prevSupport,
              },
            });
            onClose();
          }}
          onClose={onClose}
          onDelete={() => {
            if (entitySet.supports[support.id]) {
              addAction({
                type: ActionType.Delete,
                entity: Entity.Support,
                value: { id: support.id },
              });
            }
            onClose();
          }}        />      );
    }
  }
};

export default ModifyEntityCard;
