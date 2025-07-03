import { DepGraph } from "dependency-graph";
import {
  Action,
  ActionType,
  Entity,
  ResolvedNode,
  ResolvedPointLoad,
  ResolvedMember,
  ResolvedDistributedLoad,
  ResolvedMomentLoad,
  ResolvedSupport,
  ConstraintType,
} from "../types";
import resolveUndos from "./resolve-undos";
import {
  resolveMemberPosition,
  resolveNodePosition,
  resolvePointLoadPosition,
  resolveDistributedLoadPosition,
  resolveMomentLoadPosition,
  resolveSupportPosition,
} from "./resolve-position";
import getEntityType from "../get-entity-type";
import { checkSideMountedNodeBounds } from "../check-side-mounted-node-bounds";

export type EntitySet = {
  nodes: Record<string, ResolvedNode>;
  members: Record<string, ResolvedMember>;
  pointLoads: Record<string, ResolvedPointLoad>;
  distributedLoads: Record<string, ResolvedDistributedLoad>;
  momentLoads: Record<string, ResolvedMomentLoad>;
  supports: Record<string, ResolvedSupport>;
};

const reduceHistory = (history: Action[]): EntitySet => {
  const nodes: EntitySet["nodes"] = {};
  const members: EntitySet["members"] = {};
  const pointLoads: EntitySet["pointLoads"] = {};
  const distributedLoads: EntitySet["distributedLoads"] = {};
  const momentLoads: EntitySet["momentLoads"] = {};
  const supports: EntitySet["supports"] = {};

  const depGraph = new DepGraph();

  const resolvedHistory = resolveUndos(history);

  const updateEntity = (id: string) => {
    const type = getEntityType(id);

    switch (type) {
      case Entity.Node: {
        const node = nodes[id];
        nodes[id] = resolveNodePosition(node, nodes, members);
        break;
      }
      case Entity.Member: {
        const member = members[id];
        members[id] = resolveMemberPosition(member, nodes);
        break;
      }
      case Entity.PointLoad: {
        const pointLoad = pointLoads[id];
        pointLoads[id] = resolvePointLoadPosition(pointLoad, nodes, members);
        break;
      }
      case Entity.DistributedLoad: {
        const distributedLoad = distributedLoads[id];
        distributedLoads[id] = resolveDistributedLoadPosition(
          distributedLoad,
          nodes,
          members
        );
        break;
      }
      case Entity.MomentLoad: {
        const momentLoad = momentLoads[id];
        momentLoads[id] = resolveMomentLoadPosition(momentLoad, nodes, members);
        break;
      }
      case Entity.Support: {
        const support = supports[id];
        supports[id] = resolveSupportPosition(support, nodes, members);
      }
    }

    const dependants = depGraph.dependantsOf(id);

    // Recursively update all dependants
    for (const dependant of dependants) {
      updateEntity(dependant);
    }
  };

  for (const action of resolvedHistory) {
    try {
      switch (action.type) {
        case ActionType.Create: {
          switch (action.entity) {
            case Entity.Node: {
              const node = action.value?.node;

              if (!node) {
                throw new Error("Corrupted create node action");
              }

              depGraph.addNode(node.id);

              if (node.constraint1.memberId) {
                depGraph.addDependency(node.id, node.constraint1.memberId);
              }

              if (node.constraint2.memberId) {
                depGraph.addDependency(node.id, node.constraint2.memberId);
              }

              if (node.constraint1.contextNodeId) {
                depGraph.addDependency(node.id, node.constraint1.contextNodeId);
              }

              if (node.constraint2.contextNodeId) {
                depGraph.addDependency(node.id, node.constraint2.contextNodeId);
              }

              nodes[node.id] = resolveNodePosition(node, nodes, members);
              break;
            }

            case Entity.Member: {
              const member = action.value?.member;

              if (!member) {
                throw new Error("Corrupted create member action");
              }

              depGraph.addNode(member.id);

              // Add new nodes, if any
              if (member.node1.constraint1 && member.node1.constraint2) {
                const node = member.node1; // We know the constraints are there
                nodes[node.id] = resolveNodePosition(node, nodes, members);
                nodes[node.id].assembly = member.node1.assembly;
                depGraph.addNode(node.id);

                if (node.constraint1.memberId) {
                  depGraph.addDependency(node.id, node.constraint1.memberId);
                }

                if (node.constraint2.memberId) {
                  depGraph.addDependency(node.id, node.constraint2.memberId);
                }
              }

              if (member.node2.constraint1 && member.node2.constraint2) {
                const node = member.node2;
                nodes[node.id] = resolveNodePosition(node, nodes, members);
                depGraph.addNode(node.id);

                if (node.constraint1.memberId) {
                  depGraph.addDependency(node.id, node.constraint1.memberId);
                }

                if (node.constraint2.memberId) {
                  depGraph.addDependency(node.id, node.constraint2.memberId);
                }
              }

              // Add member
              members[member.id] = resolveMemberPosition(member, nodes);

              depGraph.addDependency(member.id, member.node1.id);
              depGraph.addDependency(member.id, member.node2.id);

              break;
            }

            case Entity.PointLoad: {
              const load = action.value?.pointLoad;

              if (!load) {
                throw new Error("Corrupted create point load action");
              }

              if (!load.onMember && !load.onNode) {
                throw new Error("Point load is missing onNode and onMember");
              }

              depGraph.addNode(load.id);

              if (load.onNode) {
                depGraph.addDependency(load.id, load.onNode.id);
              }

              if (load.onMember) {
                depGraph.addDependency(load.id, load.onMember.id);
              }

              pointLoads[load.id] = resolvePointLoadPosition(
                load,
                nodes,
                members
              );
              break;
            }

            case Entity.DistributedLoad: {
              const load = action.value?.distributedLoad;

              if (!load) {
                throw new Error("Corrupted create distributed load action");
              }

              if (!load.onMember) {
                throw new Error("Distributed load is missing onMember");
              }

              depGraph.addNode(load.id);
              depGraph.addDependency(load.id, load.onMember.id);

              distributedLoads[load.id] = resolveDistributedLoadPosition(
                load,
                nodes,
                members
              );
              break;
            }

            case Entity.MomentLoad: {
              const load = action.value?.momentLoad;

              if (!load) {
                throw new Error("Corrupted create moment load action");
              }

              if (!load.onMember && !load.onNode) {
                throw new Error("Moment load is missing onNode and onMember");
              }

              depGraph.addNode(load.id);

              if (load.onNode) {
                depGraph.addDependency(load.id, load.onNode.id);
              }

              if (load.onMember) {
                depGraph.addDependency(load.id, load.onMember.id);
              }

              momentLoads[load.id] = resolveMomentLoadPosition(
                load,
                nodes,
                members
              );
              break;
            }

            case Entity.Support:
              {
                const support = action.value?.support;

                if (!support) {
                  throw new Error("Corrupted create support action");
                }

                if (!support.onMember && !support.onNode) {
                  throw new Error("Support is missing onNode and onMember");
                }

                depGraph.addNode(support.id);

                if (support.onNode) {
                  depGraph.addDependency(support.id, support.onNode.id);
                }

                if (support.onMember) {
                  depGraph.addDependency(support.id, support.onMember.id);
                }

                supports[support.id] = resolveSupportPosition(
                  support,
                  nodes,
                  members
                );
              }
              break;
          }
          break;
        }

        case ActionType.Update:
          switch (action.entity) {
            case Entity.Node: {
              const node = action.value?.node;
              const prevNode = action.value?.prevNode;

              if (!node || !prevNode) {
                throw new Error("Corrupted update node action");
              }

              // Update dependencies
              if (prevNode.constraint1.memberId) {
                depGraph.removeDependency(
                  node.id,
                  prevNode.constraint1.memberId
                );
              }
              if (node.constraint1.memberId) {
                depGraph.addDependency(node.id, node.constraint1.memberId);
              }

              if (prevNode.constraint2.memberId) {
                depGraph.removeDependency(
                  node.id,
                  prevNode.constraint2.memberId
                );
              }
              if (node.constraint2.memberId) {
                depGraph.addDependency(node.id, node.constraint2.memberId);
              }

              if (prevNode.constraint1.contextNodeId) {
                depGraph.removeDependency(
                  node.id,
                  prevNode.constraint1.contextNodeId
                );
              }
              if (node.constraint1.contextNodeId) {
                depGraph.addDependency(node.id, node.constraint1.contextNodeId);
              }

              if (prevNode.constraint2.contextNodeId) {
                depGraph.removeDependency(
                  node.id,
                  prevNode.constraint2.contextNodeId
                );
              }
              if (node.constraint2.contextNodeId) {
                depGraph.addDependency(node.id, node.constraint2.contextNodeId);
              }              // Get the previous node position before updating
              const prevNodePosition = resolveNodePosition(prevNode, nodes, members).resolved;
                nodes[node.id] = resolveNodePosition(node, nodes, members);
              const updatedNodePosition = nodes[node.id].resolved;
              updateEntity(node.id);

              // Auto-scale side-mounted nodes when member endpoints move
              const memberDependants = depGraph.dependantsOf(node.id);
              for (const dependantId of memberDependants) {
                const entityType = getEntityType(dependantId);
                if (entityType === Entity.Member) {
                  const member = members[dependantId];
                  if (!member) continue;

                  // Check if this node is an endpoint of the member
                  const isNode1 = member.node1.id === node.id;
                  const isNode2 = member.node2.id === node.id;

                  if (isNode1 || isNode2) {
                    // Create previous member state for auto-scaling
                    const prevMemberNodes = { ...members[dependantId] };
                    if (isNode1) {
                      prevMemberNodes.node1 = { ...prevMemberNodes.node1, ...prevNode };
                    }
                    if (isNode2) {
                      prevMemberNodes.node2 = { ...prevMemberNodes.node2, ...prevNode };
                    }
                      const prevMemberResolved = resolveMemberPosition(prevMemberNodes, { ...nodes, [node.id]: { ...prevNode, resolved: prevNodePosition, assembly: nodes[node.id].assembly } });
                    const newMemberResolved = resolveMemberPosition(member, nodes);                    // Check if side-mounted nodes are still within bounds
                    const boundCheckActions = checkSideMountedNodeBounds(
                      dependantId,
                      prevMemberResolved,
                      newMemberResolved,
                      { nodes, members, pointLoads, distributedLoads, momentLoads, supports }
                    );                    // Apply bound check updates
                    for (const boundCheckAction of boundCheckActions) {
                      if (boundCheckAction.entity === Entity.Node && boundCheckAction.value?.node) {
                        nodes[boundCheckAction.value.node.id] = resolveNodePosition(boundCheckAction.value.node, nodes, members);
                      } else if (boundCheckAction.entity === Entity.PointLoad && boundCheckAction.value?.pointLoad) {
                        pointLoads[boundCheckAction.value.pointLoad.id] = resolvePointLoadPosition(boundCheckAction.value.pointLoad, nodes, members);
                      } else if (boundCheckAction.entity === Entity.MomentLoad && boundCheckAction.value?.momentLoad) {
                        momentLoads[boundCheckAction.value.momentLoad.id] = resolveMomentLoadPosition(boundCheckAction.value.momentLoad, nodes, members);
                      }
                    }
                  }
                }
              }              // Check if any distributed loads need their constraint coordinates updated
              // when a node moves to match a member endpoint
              const distributedLoadDependants = depGraph.dependantsOf(node.id);

              for (const dependantId of distributedLoadDependants) {
                const entityType = getEntityType(dependantId);

                if (entityType === Entity.Member) {
                  const member = members[dependantId];
                  if (!member) continue;

                  // Check if this node is an endpoint of the member
                  const isNode1 = member.node1.id === node.id;
                  const isNode2 = member.node2.id === node.id;

                  if (isNode1 || isNode2) {
                    // Find all distributed loads on this member
                    const memberLoadDependants = depGraph.dependantsOf(dependantId);

                    for (const loadId of memberLoadDependants) {
                      const loadEntityType = getEntityType(loadId);

                      if (loadEntityType === Entity.DistributedLoad) {
                        const load = distributedLoads[loadId];
                        if (!load) continue;

                        let needsUpdate = false;
                        let updatedLoad = { ...load };

                        // Check if constraint start matches the PREVIOUS node position
                        if (
                          load.onMember.constraintStart.type === ConstraintType.X &&
                          Math.abs(load.onMember.constraintStart.value - prevNodePosition.x) <
                            0.001
                        ) {
                          updatedLoad = {
                            ...updatedLoad,
                            onMember: {
                              ...updatedLoad.onMember,
                              constraintStart: {
                                ...updatedLoad.onMember.constraintStart,
                                value: updatedNodePosition.x,
                              },
                            },
                          };
                          needsUpdate = true;
                        } else if (
                          load.onMember.constraintStart.type === ConstraintType.Y &&
                          Math.abs(load.onMember.constraintStart.value - prevNodePosition.y) <
                            0.001
                        ) {
                          updatedLoad = {
                            ...updatedLoad,
                            onMember: {
                              ...updatedLoad.onMember,
                              constraintStart: {
                                ...updatedLoad.onMember.constraintStart,
                                value: updatedNodePosition.y,
                              },
                            },
                          };
                          needsUpdate = true;
                        }

                        // Check if constraint end matches the PREVIOUS node position
                        if (
                          load.onMember.constraintEnd.type === ConstraintType.X &&
                          Math.abs(load.onMember.constraintEnd.value - prevNodePosition.x) <
                            0.001
                        ) {
                          updatedLoad = {
                            ...updatedLoad,
                            onMember: {
                              ...updatedLoad.onMember,
                              constraintEnd: {
                                ...updatedLoad.onMember.constraintEnd,
                                value: updatedNodePosition.x,
                              },
                            },
                          };
                          needsUpdate = true;
                        } else if (
                          load.onMember.constraintEnd.type === ConstraintType.Y &&
                          Math.abs(load.onMember.constraintEnd.value - prevNodePosition.y) <
                            0.001
                        ) {
                          updatedLoad = {
                            ...updatedLoad,
                            onMember: {
                              ...updatedLoad.onMember,
                              constraintEnd: {
                                ...updatedLoad.onMember.constraintEnd,
                                value: updatedNodePosition.y,
                              },
                            },
                          };
                          needsUpdate = true;
                        }

                        // If the load needs to be updated, resolve its new position
                        if (needsUpdate) {
                          distributedLoads[loadId] = resolveDistributedLoadPosition(
                            updatedLoad,
                            nodes,
                            members
                          );
                        }
                      }
                    }
                  }
                }
              }

              break;
            }            case Entity.Member: {
              const member = action.value?.member;
              const prevMember = action.value?.prevMember;              if (!member || !prevMember) {
                throw new Error("Corrupted update member action");
              }

              // Check if we need to check side-mounted nodes before updating the member
              const prevMemberResolved = resolveMemberPosition(prevMember, nodes);
              const newMemberResolved = resolveMemberPosition(member, nodes);
                // Check if side-mounted nodes are still within bounds after member change
              const boundCheckActions = checkSideMountedNodeBounds(
                member.id,
                prevMemberResolved,
                newMemberResolved,
                { nodes, members, pointLoads, distributedLoads, momentLoads, supports }
              );              // Apply bound check updates from the returned actions
              for (const boundCheckAction of boundCheckActions) {
                if (boundCheckAction.entity === Entity.Node && boundCheckAction.value?.node) {
                  nodes[boundCheckAction.value.node.id] = resolveNodePosition(boundCheckAction.value.node, nodes, members);
                } else if (boundCheckAction.entity === Entity.PointLoad && boundCheckAction.value?.pointLoad) {
                  pointLoads[boundCheckAction.value.pointLoad.id] = resolvePointLoadPosition(boundCheckAction.value.pointLoad, nodes, members);
                } else if (boundCheckAction.entity === Entity.MomentLoad && boundCheckAction.value?.momentLoad) {
                  momentLoads[boundCheckAction.value.momentLoad.id] = resolveMomentLoadPosition(boundCheckAction.value.momentLoad, nodes, members);
                }
              }

              // Update dependencies
              if (prevMember.node1.id !== member.node1.id) {
                depGraph.removeDependency(member.id, prevMember.node1.id);
                depGraph.addDependency(member.id, member.node1.id);
              }

              if (prevMember.node2.id !== member.node2.id) {
                depGraph.removeDependency(member.id, prevMember.node2.id);
                depGraph.addDependency(member.id, member.node2.id);
              }

              // Update assemblies of nodes
              if (prevMember.node1.assembly !== member.node1.assembly) {
                nodes[member.node1.id].assembly = member.node1.assembly;
              }
              if (prevMember.node2.assembly !== member.node2.assembly) {
                nodes[member.node2.id].assembly = member.node2.assembly;
              }

              members[member.id] = resolveMemberPosition(member, nodes);
              updateEntity(member.id);

              break;
            }

            case Entity.PointLoad: {
              const load = action.value?.pointLoad;
              const prevLoad = action.value?.prevPointLoad;

              if (!load || !prevLoad) {
                throw new Error("Corrupted update point load action");
              }

              if (!load.onNode && !load.onMember) {
                throw new Error("Point load is missing onNode and onMember");
              }

              // Update dependencies
              if (prevLoad.onNode) {
                depGraph.removeDependency(load.id, prevLoad.onNode.id);
              }
              if (prevLoad.onMember) {
                depGraph.removeDependency(load.id, prevLoad.onMember.id);
              }
              if (load.onNode) {
                depGraph.addDependency(load.id, load.onNode.id);
              }
              if (load.onMember) {
                depGraph.addDependency(load.id, load.onMember.id);
              }

              // Update load
              pointLoads[load.id] = resolvePointLoadPosition(
                load,
                nodes,
                members
              );

              break;
            }

            case Entity.DistributedLoad: {
              const load = action.value?.distributedLoad;
              const prevLoad = action.value?.prevDistributedLoad;

              if (!load || !prevLoad) {
                throw new Error("Corrupted update distributed load action");
              }

              // Update dependencies
              depGraph.removeDependency(load.id, prevLoad.onMember.id);
              depGraph.addDependency(load.id, load.onMember.id);

              // Update load
              distributedLoads[load.id] = resolveDistributedLoadPosition(
                load,
                nodes,
                members
              );
              break;
            }

            case Entity.MomentLoad: {
              const load = action.value?.momentLoad;
              const prevLoad = action.value?.prevMomentLoad;

              if (!load || !prevLoad) {
                throw new Error("Corrupted update moment load action");
              }

              // Update dependencies
              if (prevLoad.onNode) {
                depGraph.removeDependency(load.id, prevLoad.onNode.id);
              }
              if (prevLoad.onMember) {
                depGraph.removeDependency(load.id, prevLoad.onMember.id);
              }
              if (load.onNode) {
                depGraph.addDependency(load.id, load.onNode.id);
              }
              if (load.onMember) {
                depGraph.addDependency(load.id, load.onMember.id);
              }

              // Update load
              momentLoads[load.id] = resolveMomentLoadPosition(
                load,
                nodes,
                members
              );
              break;
            }

            case Entity.Support: {
              const support = action.value?.support;
              const prevSupport = action.value?.prevSupport;

              if (!support || !prevSupport) {
                throw new Error("Corrupted update support action");
              }

              // Update dependencies
              if (prevSupport.onNode) {
                depGraph.removeDependency(support.id, prevSupport.onNode.id);
              }
              if (prevSupport.onMember) {
                depGraph.removeDependency(support.id, prevSupport.onMember.id);
              }
              if (support.onNode) {
                depGraph.addDependency(support.id, support.onNode.id);
              }
              if (support.onMember) {
                depGraph.addDependency(support.id, support.onMember.id);
              }

              supports[support.id] = resolveSupportPosition(
                support,
                nodes,
                members
              );
              break;
            }
          }
          break;

        case ActionType.Delete:
          switch (action.entity) {
            case Entity.Node: {
              const id = action.value?.id;

              if (id == null) {
                throw new Error("Corrupted delete node action");
              }

              const dependants = depGraph.dependantsOf(id);

              if (dependants.length > 0) {
                break;
              }

              delete nodes[id];
              depGraph.removeNode(id);
              break;
            }

            case Entity.Member: {
              const id = action.value?.id;

              if (id == null) {
                throw new Error("Corrupted delete node action");
              }

              const member = members[id];
              if (!member) {
                throw new Error("Member not found for deletion");
              }

              const endpointNodeIds = [member.node1.id, member.node2.id];

              const dependants = depGraph.dependantsOf(id);

              for (const dependant of dependants) {
                const type = getEntityType(dependant);

                switch (type) {
                  case Entity.Node: {
                    const { x, y } = nodes[dependant].resolved;

                    const constraint1 = { type: ConstraintType.X, value: x };
                    const constraint2 = { type: ConstraintType.Y, value: y };
                    nodes[dependant].constraint1 = constraint1;
                    nodes[dependant].constraint2 = constraint2;

                    // Remove dependency
                    depGraph.removeDependency(id, dependant);

                    break;
                  }
                  case Entity.PointLoad: {
                    delete pointLoads[dependant];
                    break;
                  }

                  case Entity.DistributedLoad: {
                    delete distributedLoads[dependant];
                    break;
                  }

                  case Entity.MomentLoad: {
                    delete momentLoads[dependant];
                    break;
                  }

                  case Entity.Support: {
                    delete supports[dependant];
                    break;
                  }
                }
              }

              delete members[id];
              depGraph.removeNode(id);

              // Check if endpoint nodes can be safely deleted
              for (const nodeId of endpointNodeIds) {
                const nodeDependants = depGraph.dependantsOf(nodeId);

                let canDeleteNode = true;

                for (const dependantId of nodeDependants) {
                  const type = getEntityType(dependantId);

                  if (type === Entity.PointLoad) {
                    delete pointLoads[dependantId];
                    depGraph.removeNode(dependantId);
                  } else if (type === Entity.MomentLoad) {
                    delete momentLoads[dependantId];
                    depGraph.removeNode(dependantId);
                  } else {
                    // Node has other dependants; cannot delete
                    canDeleteNode = false;
                    break;
                  }
                }

                if (canDeleteNode) {
                  delete nodes[nodeId];
                  depGraph.removeNode(nodeId);
                }
              }
              break;
            }

            case Entity.PointLoad: {
              const id = action.value?.id;

              if (id == null) {
                throw new Error("Corrupted delete point load action");
              }

              delete pointLoads[id];
              depGraph.removeNode(id);
              break;
            }

            case Entity.DistributedLoad: {
              const id = action.value?.id;

              if (id == null) {
                throw new Error("Corrupted delete distributed load action");
              }

              delete distributedLoads[id];
              depGraph.removeNode(id);
              break;
            }

            case Entity.MomentLoad: {
              const id = action.value?.id;

              if (id == null) {
                throw new Error("Corrupted delete moment load action");
              }

              delete momentLoads[id];
              depGraph.removeNode(id);
              break;
            }

            case Entity.Support: {
              const id = action.value?.id;

              if (id == null) {
                throw new Error("Corrupted delete support action");
              }

              delete supports[id];
              depGraph.removeNode(id);
              break;
            }
          }
          break;
      }
    } catch (err) {
      console.error("action:", action);
      throw err;
    }
  }

  // Add dependants to nodes and members
  for (const memberId of Object.keys(members)) {
    const dependants = depGraph.directDependantsOf(memberId);
    members[memberId].dependants = dependants;
  }

  for (const nodeId of Object.keys(nodes)) {
    const dependants = depGraph.directDependantsOf(nodeId);
    nodes[nodeId].dependants = dependants;
  }

  return {
    nodes,
    members,
    pointLoads,
    distributedLoads,
    momentLoads,
    supports,
  };
};

export default reduceHistory;
