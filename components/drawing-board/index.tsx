'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import RenderedNode from "./rendered-entities/node";
import RenderedMember from "./rendered-entities/member";
import { Action } from "./lib/types";
import { HEADER_HEIGHT } from "@/lib/constants/layout";
import Grid from "./grid";
import Toolbar from "./toolbar";
import { cn } from "@/lib/utils";
import { getToolSvgElements } from "./lib/tool-svg-elements";
import { InputEventType, handleInputEvent, InputEvent } from "./lib/events";
import RenderedPointLoad from "./rendered-entities/point-load";
import RenderedDistributedLoad from "./rendered-entities/distributed-load";
import RenderedMomentLoad from "./rendered-entities/moment-load";
import RenderedSupport from "./rendered-entities/support";
import { DrawingState, Tool } from "./lib/types";
import reduceHistory from "./lib/reduce-history";
import ModifyEntityCard from "./modify-entity-card";
import { getEntityPosition } from "./lib/entity-position";
import { fromSvgCoordinates } from "./lib/svg-coordinates";
import processSideMountedNodes from "./lib/process-side-mounted-nodes";
import {
  resolveDistributedLoadPosition,
  resolvePointLoadPosition,
  resolveMomentLoadPosition,
} from "./lib/reduce-history/resolve-position";
import { aboveOrBelowLine, offsetPointFromLine } from "./lib/geometry";
import RightAngle from "./right-angle";
import AddEntityCard from "./add-entity-card";
import DisplayOptionsCard from "./display-options-card";
import { Analysis, Drawing, LimitState, Simulation, SimulationStatus } from "@/lib/types";
import {
  defaultDrawingState,
  makeDrawingState,
} from "./lib/make-drawing-state";
import TopBar from "./top-bar";
import { toMemberSimulations } from "@/lib/to-member-simulations";
import ForceLine, { VeForceLine, Reactions } from "./rendered-entities/force-line";
import SimulationsSidebar from "./simulations-sidebar";
import URMatrix from "./ur-matrix";
import { hideAllEntities, showAllEntities } from "./lib/show-entities";
import SimulationCard from "./simulation-card";
import ScaleSimulationCard from "./scale-simulation-card";
import GlobalLocalDefCard from "./global-local-def-card";
import { getShowLoadByIds } from "./lib/show-loads-by-id";
import PendingIndicator from "./pending-indicator";
import ContextHint from "./context-hint";
import { useContextHints } from "./lib/use-context-hints";
import { calculateCardPosition, getCardTypeFromEntity } from "./lib/card-positioning";
import { CreateDrawingData } from "@/lib/api";

type DrawingBoardProps = {
  drawing?: Drawing | null;
  simulation?: Simulation;
  onSave: (drawing: CreateDrawingData) => void;
  onDelete?: () => void;
  onSimulationQueued?: () => void;
};

const DrawingBoard: React.FC<DrawingBoardProps> = ({
  drawing,
  simulation,
  onSave,
  onDelete,
  onSimulationQueued,
}) => {
  const svgRef = useRef(null);
  const [runInProgress, setRunInProgress] = useState(false);

  // Simulations
  const [selectedLimitState, setSelectedLimitState] =
    useState<LimitState>("ULS");
  // Remember what LimitState was selected before entering Ve, so we can restore it when leaving Ve
  const [prevLimitStateBeforeVe, setPrevLimitStateBeforeVe] = useState<LimitState | null>(null);
  const [selectedLC, setSelectedLC] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);  const [showSimulation, setShowSimulation] = useState(false);
  const [scaleF1, setScaleF1] = useState(0.00005); // Add this state
  const [scaleF2, setScaleF2] = useState(0.00005); // Add this state
  const [scaleM, setScaleM] = useState(0.00005); // Add this state
  const [scaleVe, setScaleVe] = useState(10); // Add this state
  const [scaleR0, setScaleR0] = useState(0.001); // Add scale for reactions
  const [selectedGlobalLocal, setSelectedGlobalLocal] = useState<"global" | "local">("global");
  const [selectedReactionIndex, setSelectedReactionIndex] = useState<number | null>(null); // Add reaction selection state
  // Prevent a single-frame flash when switching analyses
  const [switchingAnalysis, setSwitchingAnalysis] = useState(false);
  const prevAnalysisRef = useRef<Analysis | null>(null);
  useEffect(() => {
    if (analysis !== prevAnalysisRef.current && analysis != null) {
      // If we're leaving Ve, restore the previous LimitState deterministically here
      if (prevAnalysisRef.current === "Ve" && analysis !== "Ve" && prevLimitStateBeforeVe) {
        setSelectedLimitState(prevLimitStateBeforeVe);
        setPrevLimitStateBeforeVe(null);
      }
      setSwitchingAnalysis(true);
      const id = requestAnimationFrame(() => setSwitchingAnalysis(false));
      prevAnalysisRef.current = analysis;
      return () => cancelAnimationFrame(id);
    }
  }, [analysis]);

  // To avoid firing the click event when dragging the mouse
  const [mouseDownStartPos, setMouseDownStartPos] = useState<
    [number, number] | null
  >(null);

  const reshapedSimulation = useMemo(() => {
    return toMemberSimulations(simulation);
  }, [simulation]);
  const { memberSimulations, R0, loadCombinationsUR, loadCombinationsFactorMat, loadCombinationsFactorMatIds } =
    reshapedSimulation || {};

  // Do not auto-select a load combination; require explicit user choice across analyses.
  // If needed, this can be enhanced to preserve LC when switching limit states in SimulationCard.

  const showFE = false;

  // DRAWING STATE
  const aspectRatio = window.innerWidth / (window.innerHeight - HEADER_HEIGHT);
  const [state, setState] = useState<DrawingState>(
    drawing
      ? makeDrawingState(drawing, aspectRatio)
      : defaultDrawingState(aspectRatio)
  );
  const viewBoxStr: string = state.viewBox.join(" ");
  // Gate results solely by local change flag to avoid stale server values
  const hasChangedSinceSim = !!state.hasChanges;

  const addAction = (action: Action | Action[]) => {
    setState((s) => ({ ...s, hasChanges: true }));
    
    if (Array.isArray(action)) {
      const history = [...state.history, ...action];
      return setState((s) => ({ ...s, history }));
    }

    const history = [...state.history, action];
    setState((s) => ({ ...s, history }));
  };
  const setHoveringId = (id: string | null) =>
    setState((s) => ({ ...s, hoveringId: id }));

  // Context hints hook
  const { currentHint, dismissHint } = useContextHints(state, analysis, showSimulation);

  const enableSimulationView = () => {
    setShowSimulation(true);
    setState((s) => ({
      ...s,
      tool: Tool.Select,
      selectedIds: [],
    }));
  };

  const disableSimulationView = () => {
    setShowSimulation(false);
    setAnalysis(null);
    setState((s) => ({ 
      ...s,
      showEntities: showAllEntities, 
      selectedIds: [] 
    }));
  };  const entitySet = useMemo(
    () =>
      showSimulation && simulation?.entities
        ? simulation?.entities
        : reduceHistory(state.history),
    [state.history, showSimulation, simulation?.entities]
  );

  const processedEntitySet = useMemo(
    () => processSideMountedNodes(entitySet, state.viewBox[3] * 0.003),
    [entitySet, state.viewBox[3], drawing?.id]
  );

  const handleEvent = (input: InputEvent) => {
    const update = handleInputEvent(
      state,
      svgRef.current,
      processedEntitySet,
      input
    );

    if (!update) {
      return;
    }

    setState((s) => ({ ...s, ...update }));
  };

  const {
    nodes,
    members,
    pointLoads,
    distributedLoads,
    momentLoads,
    supports,
  } = processedEntitySet;  // compute scaling for point loads: largest magnitude => 1/5 of viewBox height
  const maxPointMag = useMemo(() => {
    const existingMagnitudes = Object.values(pointLoads).map((l) => Math.abs(l.magnitude ?? 0));
    const modifyingMagnitude = state.modifyingEntity?.pointLoad?.magnitude ? Math.abs(state.modifyingEntity.pointLoad.magnitude) : 0;
    return Math.max(1, ...existingMagnitudes, modifyingMagnitude);
  }, [pointLoads, state.modifyingEntity?.pointLoad?.magnitude]);
  
  const pointScale = (state.viewBox[3] / 6) / maxPointMag;
  
  // compute scaling for moment loads: largest magnitude => 1/8 of viewBox height
  const maxMomentMag = useMemo(() => {
    const existingMagnitudes = Object.values(momentLoads).map((l) => Math.abs(l.magnitude ?? 0));
    const modifyingMagnitude = state.modifyingEntity?.momentLoad?.magnitude ? Math.abs(state.modifyingEntity.momentLoad.magnitude) : 0;
    return Math.max(1, ...existingMagnitudes, modifyingMagnitude);
  }, [momentLoads, state.modifyingEntity?.momentLoad?.magnitude]);
  
  const momentScale = (state.viewBox[3] / 15) / maxMomentMag;
  
  // compute scale for distributed loads so largest maps to 1/5 of viewBox height
  const maxDistributedMag = useMemo(() => {
    const existingMagnitudes = Object.values(distributedLoads).flatMap((l) => [Math.abs(l.magnitude1 ?? 0), Math.abs(l.magnitude2 ?? 0)]);
    const modifyingMagnitudes = state.modifyingEntity?.distributedLoad ? [
      Math.abs(state.modifyingEntity.distributedLoad.magnitude1 ?? 0),
      Math.abs(state.modifyingEntity.distributedLoad.magnitude2 ?? 0)
    ] : [];
    return Math.max(1, ...existingMagnitudes, ...modifyingMagnitudes);
  }, [distributedLoads, state.modifyingEntity?.distributedLoad?.magnitude1, state.modifyingEntity?.distributedLoad?.magnitude2]);
  
  const distributedScale = (state.viewBox[3] / 10) / maxDistributedMag;

  const selectedEntityPosition =
    state.selectedIds.length >= 1
      ? getEntityPosition(state.selectedIds[0], processedEntitySet)
      : null;

  const selectedEntityClientPosition = selectedEntityPosition
    ? fromSvgCoordinates(selectedEntityPosition, svgRef.current)
    : null;

  const selectedMemberSimulation = memberSimulations?.find(
    (m: any) => m.id === state.selectedIds[0]
  );

  // Mount hotkey event listener on window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Disable events if writing in input
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
        return;
      }

      // TODO: Maybe not necessary to handle these as special cases?
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") {
        handleEvent({ type: InputEventType.CtrlShiftZ });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        handleEvent({ type: InputEventType.CtrlY });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        handleEvent({ type: InputEventType.CtrlZ });
        return;
      }

      handleEvent({
        type: InputEventType.HotKey,
        payload: {
          key: e.key,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
        },
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state]);

  // Resize screen handler
  useEffect(() => {
    const handleResize = () => {
      const aspectRatio =
        window.innerWidth / (window.innerHeight - HEADER_HEIGHT);
      setState(({ viewBox: [x, y, _, h], ...s }) => ({
        ...s,
        viewBox: [x, y, h * aspectRatio, h],
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (typeof drawing?.hasChanges === 'boolean') {
      setState(prev => ({ ...prev, hasChanges: !!drawing.hasChanges }));
    }
  }, [drawing?.hasChanges]);

  // Keep local run flag in sync with simulation prop
  useEffect(() => {
    if (simulation?.status === SimulationStatus.Pending || simulation?.status === SimulationStatus.Running) {
      setRunInProgress(true);
    } else {
      setRunInProgress(false);
    }
  }, [simulation?.status]);

  // Proactive updates: Prefer SSE for immediate updates; fallback to polling until props reflect completion
  useEffect(() => {
    if (!drawing?.id || !simulation?.id) return;
    const isActive = simulation?.status === SimulationStatus.Pending || simulation?.status === SimulationStatus.Running;
    if (!isActive) return;

    let cancelled = false;
    let intervalId: any;
    let sse: EventSource | null = null;

    // Try SSE first
    try {
      sse = new EventSource(`/api/simulations/${simulation.id}/events`);
      sse.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data?.status === SimulationStatus.Completed || data?.status === SimulationStatus.Failed) {
            onSimulationQueued?.();
          }
        } catch {}
      };
      sse.onerror = () => {
        // If SSE errors, the polling below will handle updates
      };
    } catch {}
    const poll = async () => {
      try {
        const res = await fetch(`/api/simulations/${simulation.id}` as string, {
          // Ensure we bypass any HTTP caches in production/CDN
          cache: "no-store",
          credentials: "same-origin",
          headers: { "cache-control": "no-cache" },
        });
        if (!res.ok) return;
        const latest = await res.json();
        if (latest?.status === SimulationStatus.Completed || latest?.status === SimulationStatus.Failed) {
          if (!cancelled) {
            // Ask parent to refetch so UI updates ASAP; keep polling until props reflect it
            onSimulationQueued?.();
          }
        }
      } catch (_) {
        // ignore transient errors during polling
      }
    };

    // Fast first check, then steady interval
    poll();
    intervalId = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
      if (sse) {
        try { sse.close(); } catch {}
      }
    };
  }, [drawing?.id, simulation?.id, simulation?.status, onSimulationQueued]);

  // TODO: Add cursor classes to div when they work
  const SnappingAngle: React.FC = () => {
    if (
      !state.isDrawingMember ||
      !state.startMemberId ||
      !state.isSnappingOrthogonally
    ) {
      return null;
    }

    const line = processedEntitySet.members[state.startMemberId].resolved;

    const size = state.viewBox[3] * 0.03;

    return (
      <RightAngle
        point={state.startPosition}
        onLine={line}
        sign={aboveOrBelowLine(line, state.cursorPosition)}
        size={size}
      />
    );
  };

  // TODO: Position entity cards (adding and modifying) based on selection card size
  return (
    <div className="h-full w-full flex flex-col">
      <TopBar
  onSave={(data) => {
          // Update local flag immediately so results can enable post-run
          if (typeof data.hasChanges === 'boolean') {
            setState((s) => ({ ...s, hasChanges: data.hasChanges! }));
          }
          onSave(data);
        }}
        state={state}
        drawing={drawing}
        onDelete={onDelete}
        entitySet={entitySet}
  simulationId={simulation?.status === SimulationStatus.Completed && !hasChangedSinceSim && !runInProgress ? simulation?.id : undefined}
  showDownload={simulation?.status === SimulationStatus.Completed && !hasChangedSinceSim && !runInProgress}
  onSimulationQueued={onSimulationQueued}
  onRunStart={() => setRunInProgress(true)}
      />
      <div className="h-full flex">
        <div className="h-full">
          <Toolbar
            selected={state.tool}
            onSelect={(tool: Tool) => setState((s) => ({ ...s, tool }))}
            disabled={showSimulation}
            onClick={() => disableSimulationView()}
          />
        </div>
        <div className="relative h-full w-full bg-gray-100">
          {showSimulation &&
            loadCombinationsUR &&
            analysis && (
              <div className="absolute top-2 right-2 z-40">
                <SimulationCard
                  analysis={analysis}
                  selectedLC={selectedLC}
                  setSelectedLC={setSelectedLC}
                  selectedLimitState={selectedLimitState}
                  setSelectedLimitState={setSelectedLimitState}
                  loadCombinations={loadCombinationsUR[selectedLimitState]}
                  loadCombinationsUR={loadCombinationsUR}
                />
              </div>
            )}

          {(runInProgress || (simulation?.status && (simulation.status === SimulationStatus.Pending || simulation.status === SimulationStatus.Running))) && (
            <div className="absolute h-full w-full flex justify-center items-center z-40 bg-gray-100/60">
              <PendingIndicator />
            </div>
          )}

          {showSimulation && !selectedLC && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto bg-white/85 border rounded-lg px-4 py-3 text-gray-700 shadow-sm">
                Vælg en lastkombination for at vise laster og resultater.
              </div>
            </div>
          )}

          <div className="absolute z-30 top-4 w-full flex justify-center">
            <div className="flex flex-col items-center gap-4 w-full max-w-md">
              <div className="w-full">
                <DisplayOptionsCard state={state} setState={setState} />
              </div>              {analysis && ["F1", "F2", "M", "Ve", "R0"].includes(analysis as string) && (
                <div className="w-full">
                  <ScaleSimulationCard
                    scale={
                      analysis === "Ve"
                        ? scaleVe
                        : analysis === "F1"
                        ? scaleF1
                        : analysis === "F2"
                        ? scaleF2
                        : analysis === "M"
                        ? scaleM
                        : analysis === "R0"
                        ? scaleR0
                        : scaleF1 // default case
                    }
                    setScale={
                      analysis === "Ve"
                        ? setScaleVe
                        : analysis === "F1"
                        ? setScaleF1
                        : analysis === "F2"
                        ? setScaleF2
                        : analysis === "M"
                        ? setScaleM
                        : analysis === "R0"
                        ? setScaleR0
                        : setScaleF1 // default case
                    }
                    analysis={analysis}
                  />
                  {analysis === "Ve" && (
                    <div className="w-full mt-2">
                      <GlobalLocalDefCard 
                        selected={selectedGlobalLocal} 
                        setSelected={setSelectedGlobalLocal} 
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ADDING ENTITY CARD */}
          {!showSimulation &&
            state.modifyingEntity &&
            state.selectedIds.length === 0 && (
              <AddEntityCard
                state={state}
                setState={setState}
                entitySet={processedEntitySet}
                svgRef={svgRef.current}
                addAction={addAction}
                windCalculatorSettings={state.windCalculatorSettings}
                onWindCalculatorSettingsChange={(settings) =>
                  setState((s) => ({ 
                    ...s, 
                    windCalculatorSettings: { ...s.windCalculatorSettings, ...settings },
                    hasChanges: true 
                  }))
                }
              />
            )}          {/* MODIFY ENTITY CARD */}
          {!showSimulation &&
            state.modifyingEntity &&
            selectedEntityClientPosition && (
              <div
                className="absolute"
                style={(() => {
                  const entityType = state.selectedIds[0]?.startsWith('n-') ? 'Node' :
                                   state.selectedIds[0]?.startsWith('m-') ? 'Member' :
                                   state.selectedIds[0]?.startsWith('pl-') ? 'PointLoad' :
                                   state.selectedIds[0]?.startsWith('dl-') ? 'DistributedLoad' :
                                   state.selectedIds[0]?.startsWith('ml-') ? 'MomentLoad' :
                                   state.selectedIds[0]?.startsWith('s-') ? 'Support' : 'Node';
                  const cardType = getCardTypeFromEntity(entityType, false);
                  return calculateCardPosition(
                    selectedEntityClientPosition.clientX,
                    selectedEntityClientPosition.clientY,
                    cardType
                  );
                })()}
              >
                <ModifyEntityCard
                  entitySet={processedEntitySet}
                  state={state}
                  setState={setState}
                  addAction={addAction}
                  windCalculatorSettings={state.windCalculatorSettings}
                  onWindCalculatorSettingsChange={(settings) =>
                    setState((s) => ({ 
                      ...s, 
                      windCalculatorSettings: { ...s.windCalculatorSettings, ...settings },
                      hasChanges: true 
                    }))
                  }
                  key={state.selectedIds[0]}
                />
              </div>
            )}

          {/* UTILIZATION RATIO MATRIX */}
          {analysis === "UR" &&
            selectedLimitState &&
            selectedMemberSimulation?.UR && (
              <div className="absolute bottom-2 left-2">
                <URMatrix
                  rowNames={
                    selectedMemberSimulation.UR[`URnames_${selectedLimitState}`]
                  }
                  colNames={
                    selectedMemberSimulation.UR[
                      `LoadCombnames_${selectedLimitState}`
                    ]
                  }
                  matrix={
                    selectedMemberSimulation.UR[
                      `UR_loadcomb_mat_${selectedLimitState}`
                    ]
                  }
                />
              </div>
            )}

          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className={cn("absolute z-10")}
            viewBox={viewBoxStr}
            onClick={(e) => {
              // If mouse was dragged, don't trigger click event
              if (
                mouseDownStartPos &&
                (mouseDownStartPos[0] !== e.clientX ||
                  mouseDownStartPos[1] !== e.clientY)
              ) {
                return;              }
              // Reset reaction selection when clicking on canvas
              setSelectedReactionIndex(null);
              handleEvent({
                type: InputEventType.CanvasClick,
                payload: {
                  altKey: e.altKey,
                  ctrlKey: e.ctrlKey,
                  metaKey: e.metaKey,
                },
              });
            }}
            onMouseMove={(e) =>
              handleEvent({
                type: InputEventType.CanvasMouseMove,
                payload: {
                  clientPosition: { clientX: e.clientX, clientY: e.clientY },
                  altKey: e.altKey,
                  ctrlKey: e.ctrlKey,
                  metaKey: e.metaKey,
                },
              })
            }
            onMouseDown={(e) => {
              setMouseDownStartPos([e.clientX, e.clientY]);
              handleEvent({
                type: InputEventType.CanvasMouseDown,
                payload: {
                  clientPosition: { clientX: e.clientX, clientY: e.clientY },
                  button: e.button,
                  altKey: e.altKey,
                  ctrlKey: e.ctrlKey,
                  metaKey: e.metaKey,
                },
              });
            }}
            onMouseUp={(e) =>
              handleEvent({
                type: InputEventType.CanvasMouseUp,
                payload: {
                  clientPosition: { clientX: e.clientX, clientY: e.clientY },
                  altKey: e.altKey,
                  ctrlKey: e.ctrlKey,
                  metaKey: e.metaKey,
                },
              })
            }
            onWheel={(e) => {
              e.stopPropagation();
              handleEvent({
                type: InputEventType.CanvasWheel,
                payload: {
                  clientPosition: { clientX: e.clientX, clientY: e.clientY },
                  deltaY: e.deltaY,
                },
              });
            }}
          >
            {/* GRID */}
            {state.showGrid && <Grid gridSize={state.gridSize} viewBox={state.viewBox} />}
            {/* TOOL SPECIFIC */}
            {getToolSvgElements(state)}
            {/* ORTHOGONAL SNAP ANGLE */}
            <SnappingAngle />

  {/* DISTRIBUTED LOADS */}
            {Object.values(distributedLoads).map((load) => {
         // In simulation view, do not render loads when no load combination is selected
         if (showSimulation && !selectedLC) {
                 return null;
               }
          // During the exact frame of an analysis switch, skip loads to avoid flicker
          if (showSimulation && switchingAnalysis) {
                 return null;
               }
               if (selectedLC && loadCombinationsFactorMat && loadCombinationsFactorMatIds && showSimulation) {
                 const showLoadByIds = getShowLoadByIds(selectedLC, selectedLimitState, loadCombinationsFactorMat, loadCombinationsFactorMatIds);
                 if (!showLoadByIds.includes(load.id)) {
                   return null;
                 }
               }
               if (!state.showEntities.distributedLoads[load.type]) {
                 return null;
               }

               const isSelected = state.selectedIds.includes(load.id);
               const strokeWidth = isSelected
                 ? state.viewBox[3] * 0.002
                 : state.viewBox[3] * 0.0015;
              // apply computed scale: each load arrow length = magnitude * distributedScale
              const size = distributedScale;

               const isHovered = state.hoveringId === load.id;

               return (
                <RenderedDistributedLoad
                  key={load.id}
                  load={load}
                  onClick={(payload) => {
                    handleEvent({
                      type: InputEventType.DistributedLoadClick,
                      payload,
                    });
                  }}
                  gridSize={state.gridSize}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  strokeWidth={strokeWidth}
                  size={size}
                  onMouseEnter={() => setHoveringId(load.id)}
                  onMouseLeave={() => setHoveringId(null)}
                />
              );
              })}

            {/* SUPPORTS (beneath distributed loads) */}
            {analysis !== "Ve" && analysis !== "R0" && Object.values(supports).map((support) => {
              const isSelected = state.selectedIds.includes(support.id);
              const strokeWidth = 2.5;
              const size = isSelected
                ? state.viewBox[3] * 0.04
                : state.viewBox[3] * 0.03;
              return (
                <RenderedSupport
                  key={support.id}
                  support={support}
                  strokeWidth={strokeWidth}
                  isSelected={isSelected}
                  size={size}
                  onClick={(payload) =>
                    handleEvent({
                      type: InputEventType.SupportClick,
                      payload,
                    })
                  }
                  onMouseEnter={() => setHoveringId(support.id)}
                  onMouseLeave={() => setHoveringId(null)}
                />
              );
            })}

            {/* MEMBERS (beneath point/moment loads) */}
            {Object.values(members).map((member) => {
              const isSelected = state.selectedIds.includes(member.id);
              const strokeWidth = isSelected
                ? state.viewBox[3] * 0.004
                : state.viewBox[3] * 0.002;
              const isHovered = state.hoveringId === member.id;
              return (
                <RenderedMember
                  key={member.id}
                  member={member}
                  strokeWidth={strokeWidth}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  isVeAnalysis={analysis === "Ve"}
                  onClick={(payload) =>
                    handleEvent({
                      type: InputEventType.MemberClick,
                      payload: { id: member.id, ...payload },
                    })
                  }
                  onMouseEnter={() => setHoveringId(member.id)}
                  onMouseLeave={() => setHoveringId(null)}
                  isSectionForceAnalysis={analysis === "F1" || analysis === "F2" || analysis === "M"}
                  globalLocal={selectedGlobalLocal}
                  memberSimulations={memberSimulations?.find((m: any) => m.id === member.id)}
                  scaleVe={scaleVe}
                  selectedLC={selectedLC}
                />
              );
            })}

            {/* NODES (beneath point/moment loads) */}
            {analysis !== "Ve" && Object.values(nodes).map((node) => {
              const isSelected = state.selectedIds.includes(node.id);
              const strokeWidth = isSelected
                ? state.viewBox[3] * 0.002
                : state.viewBox[3] * 0.001;
              const size = isSelected
                ? state.viewBox[3] * 0.0035
                : state.viewBox[3] * 0.0025;
              const isHovered = state.hoveringId === node.id;
              return (
                <RenderedNode
                  onClick={(payload) =>
                    handleEvent({
                      type: InputEventType.NodeClick,
                      payload,
                    })
                  }
                  isSelected={isSelected}
                  key={`node-${node.id}`}
                  node={node}
                  size={size}
                  strokeWidth={strokeWidth}
                  isHovered={isHovered}
                  onMouseEnter={() => setHoveringId(node.id)}
                  onMouseLeave={() => setHoveringId(null)}
                />
              );
            })}

            {/* POINT LOADS (on top) */}
            {Object.values(pointLoads).map((load) => {
              // In simulation view, do not render loads when no load combination is selected
              if (showSimulation && !selectedLC) return null;
              // During the exact frame of an analysis switch, skip loads to avoid flicker
              if (showSimulation && switchingAnalysis) return null;
              if (!state.showEntities.pointLoads[load.type]) return null;
              const isSelected = state.selectedIds.includes(load.id);
              const strokeWidth = isSelected
                ? state.viewBox[3] * 0.003
                : state.viewBox[3] * 0.002;
              const size = pointScale;
              const isHovered = state.hoveringId === load.id;

              return (
                <RenderedPointLoad
                  key={load.id}
                  load={load}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  strokeWidth={strokeWidth}
                  size={size}
                  onClick={(payload) =>
                    handleEvent({ type: InputEventType.PointLoadClick, payload: { ...payload, id: load.id } })
                  }
                  onMouseEnter={() => setHoveringId(load.id)}
                  onMouseLeave={() => setHoveringId(null)}
                />
              );
            })}

            {/* MOMENT LOADS (on top) */}
            {Object.values(momentLoads).map((load) => {
              // In simulation view, do not render loads when no load combination is selected
              if (showSimulation && !selectedLC) return null;
              // During the exact frame of an analysis switch, skip loads to avoid flicker
              if (showSimulation && switchingAnalysis) return null;
              if (!state.showEntities.momentLoads[load.type]) return null;
              const isSelected = state.selectedIds.includes(load.id);
              const size = momentScale;
              const isHovered = state.hoveringId === load.id;

              return (
                <RenderedMomentLoad
                  key={load.id}
                  load={load}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  size={size}
                  onClick={(payload) =>
                    handleEvent({ type: InputEventType.MomentLoadClick, payload: { ...payload, id: load.id } })
                  }
                  onMouseEnter={() => setHoveringId(load.id)}
                  onMouseLeave={() => setHoveringId(null)}
                />
              );
            })}            {/* LOAD BEING ADDED/MODIFIED */}
            {state.modifyingEntity?.pointLoad && (
              <RenderedPointLoad
                load={{
                  ...resolvePointLoadPosition(
                    state.modifyingEntity.pointLoad,
                    nodes,
                    members
                  ),
                  magnitude: state.modifyingEntity.pointLoad.magnitude
                }}
                className="opacity-50"
                strokeWidth={state.viewBox[3] * 0.002}
                size={pointScale}
                isSelected={false}
                isHovered={false}
              />
            )}
            {state.modifyingEntity?.distributedLoad && (
              <RenderedDistributedLoad
                load={{
                  ...resolveDistributedLoadPosition(
                    state.modifyingEntity.distributedLoad,
                    nodes,
                    members
                  ),
                  magnitude1: state.modifyingEntity.distributedLoad.magnitude1,
                  magnitude2: state.modifyingEntity.distributedLoad.magnitude2
                }}
                className="opacity-20"
                gridSize={state.gridSize}
                strokeWidth={state.viewBox[3] * 0.002}
                size={distributedScale}
                isSelected={false}
                isHovered={false}
              />
            )}
            {state.modifyingEntity?.momentLoad && (
              <g opacity="0.5">
                <RenderedMomentLoad
                  load={{
                    ...resolveMomentLoadPosition(
                      state.modifyingEntity.momentLoad,
                      nodes,
                      members
                    ),
                    magnitude: state.modifyingEntity.momentLoad.magnitude
                  }}
                  size={momentScale}
                  isSelected={false}
                  isHovered={false}
                />
              </g>
            )}            {/* REACTIONS (R0) - Global, not per member */}
            {simulation &&
              showSimulation &&
              selectedLC &&
              analysis === "R0" &&
              R0 && (                <Reactions
                  key="reactions-global"
                  loadCombination={selectedLC}
                  limitState={selectedLimitState}
                  scale={scaleR0}
                  viewBox={state.viewBox}
                  R0={R0}
                  selectedReactionIndex={selectedReactionIndex}
                  setSelectedReactionIndex={setSelectedReactionIndex}
                />
              )}

            {/* SIMULATIONS */}
            {simulation &&
              showSimulation &&
              selectedLC && (
                <>                  {/* Member simulations */}
                  {memberSimulations?.map((memberSim: any) => {
                const { id, nodes, elements } = memberSim;
                // Show elements?
                const FENodes = showFE && selectedLC
                  ? nodes.map(({ x, y }: any, i: number) => (
                      <circle
                        key={`FENode-${id}-${i}`}
                        cx={x}
                        cy={y}
                        r={0.05}
                        fill="red"
                      />
                    ))
                  : [];

                const member = processedEntitySet.members[id];

                if (!member) {
                  return null;
                }                const FEElements = elements.map((element: any, i: number) => {
                  if (!selectedLC) {
                    return null;
                  }
                  if (analysis === "UR") {
                    return null;
                  }
                  if (analysis === "Ve") {
                    if (selectedLimitState!=="SLS"){
                      return null;
                    }
                    return (
                      <VeForceLine
                        key={`simelement-${id}-${i}`}
                        element={element}
                        loadCombination={selectedLC}
                        scale={-scaleVe}
                        svgRef={svgRef.current}
                        viewBox={state.viewBox}
                        globalLocal={selectedGlobalLocal} // <-- add this
                      />
                    );                  }

                  // R0 is handled globally outside this loop
                  if (analysis === "R0") {
                    return null;
                  }

                  return (
                    <ForceLine
                      key={`simelement-${id}-${i}`}
                      element={element}
                      loadCombination={selectedLC}
                      analysis={analysis as "F1" | "F2" | "M"}
                      limitState={selectedLimitState}
                      scale={analysis=="F1" ? scaleF1 : analysis=="F2" ? scaleF2 : analysis=="M" ? scaleM : scaleF1} // Use the scale from state
                      svgRef={svgRef.current}
                      viewBox={state.viewBox}
                      memberSimulation={memberSim}
                    />
                  );
                });return [...FENodes, ...FEElements];
              })}
            </>)}

            {/* UR LABELS */}
            {analysis === "UR" &&
              selectedLC &&
              selectedLimitState &&
              memberSimulations?.map((sim: any) => {
                const fontSize = state.viewBox[3] / 70;
                const rectWidth = fontSize * 4; // Scale width with fontSize
                const rectHeight = fontSize * 2; // Scale height with fontSize
                const rectX = -rectWidth / 2; // Center the rect
                const rectY = -rectHeight / 2; // Center the rect
                const member = members[sim.id];

                if (selectedLC === "Maksimale udnyttelser, samlet") {
                  const matrix = sim.UR?.[`UR_loadcomb_mat_${selectedLimitState}`];
                  if (!matrix) return null;
                  const rowMaxes = matrix.map((row: any) => Math.max(...row));
                  const maxURValue = Math.max(...rowMaxes);
                  // const loadCombName = sim.UR?.[`LoadCombnames_${selectedLimitState}`]?.[colIndex];
                  // const ucCheck = sim.UR?.[`URnames_${selectedLimitState}`]?.[maxRowIndex];
                  // ...existing code (get member, midpoint, offset)...
                  if (!member || Number.isNaN(maxURValue)) {
                    return null;
                  }
  
                  const midX =
                    (member.resolved.point2.x + member.resolved.point1.x) / 2;
                  const midY =
                    (member.resolved.point2.y + member.resolved.point1.y) / 2;
  
                  const { x, y } = offsetPointFromLine(
                    { x: midX, y: midY },
                    member.resolved,
                    0
                  );
  
                  return (
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEvent({
                          type: InputEventType.MemberClick,
                          payload: { id: sim.id, ...e },
                        });
                      }}
                      transform={`translate(${x}, ${y})`}
                      className="cursor-pointer"
                      key={`member-ur-label-${sim.id}`}
                    >
                      <rect
                        x={rectX}
                        y={rectY}
                        rx={fontSize * 0.5} // Scale corner radius with fontSize
                        ry={fontSize * 0.5}
                        width={rectWidth}
                        height={rectHeight}
                        fill={(maxURValue * 100) > 100 ? "red" : "white"}
                        stroke="black"
                        strokeWidth={fontSize * 0.02} // Scale stroke width with fontSize
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={fontSize}
                        fontStyle="italic"
                        fill={(maxURValue * 100) > 100 ? "white" : "black"}
                      >
                        {(maxURValue * 100).toFixed(1)} %
                      </text>
                    </g>
                  );
                }

                const selectedLCIndex =
                  sim.UR?.[`LoadCombnames_${selectedLimitState}`]?.findIndex(
                    (lc: any) => lc === selectedLC
                  ) ?? 0;

                const ratios =
                  sim.UR?.[`UR_loadcomb_mat_${selectedLimitState}`]?.map(
                    (row: any) => row[selectedLCIndex]
                  ) ?? [];

                const maxURValue = Math.max(...ratios);

                if (!member || Number.isNaN(maxURValue)) {
                  return null;
                }

                const midX =
                  (member.resolved.point2.x + member.resolved.point1.x) / 2;
                const midY =
                  (member.resolved.point2.y + member.resolved.point1.y) / 2;

                const { x, y } = offsetPointFromLine(
                  { x: midX, y: midY },
                  member.resolved,
                  0
                );

                return (
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEvent({
                        type: InputEventType.MemberClick,
                        payload: { id: sim.id, ...e },
                      });
                    }}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer"
                    key={`member-ur-label-${sim.id}`}
                  >
                    <rect
                      x={rectX}
                      y={rectY}
                      rx={fontSize * 0.5} // Scale corner radius with fontSize
                      ry={fontSize * 0.5}
                      width={rectWidth}
                      height={rectHeight}
                      fill={(maxURValue * 100) > 100 ? "red" : "white"}
                      stroke="black"
                      strokeWidth={fontSize * 0.02} // Scale stroke width with fontSize
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={fontSize}
                      fontStyle="italic"
                      fill={(maxURValue * 100) > 100 ? "white" : "black"}
                    >
                      {(maxURValue * 100).toFixed(1)} %
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>
        <div className="h-full">
  <SimulationsSidebar            onSelect={(nextAnalysis: Analysis) => {
              // Reset reaction selection when switching analysis
              setSelectedReactionIndex(null);
              // Determine target limit state for validation (Ve uses SLS; leaving Ve restores prev)
              const leavingVe = analysis === "Ve" && nextAnalysis !== "Ve";
              const enteringVe = nextAnalysis === "Ve" && analysis !== "Ve";
              const targetLimitState: LimitState = enteringVe
                ? "SLS"
                : leavingVe && prevLimitStateBeforeVe
                ? prevLimitStateBeforeVe
                : selectedLimitState;

              // If entering Ve, save current LS and set LS to SLS
              if (enteringVe) {
                setPrevLimitStateBeforeVe(selectedLimitState);
                if (selectedLimitState !== "SLS") {
                  setSelectedLimitState("SLS");
                }
              }

              // Validate current LC for next analysis and target LS
              const isSpecial = selectedLC === "Maksimale udnyttelser, samlet";
              const specialAllowed = ["UR", "M", "F1", "F2"].includes(nextAnalysis);
              const combos = loadCombinationsUR?.[targetLimitState] || [];
              const lcIsValid = !!selectedLC && (!isSpecial
                ? combos.includes(selectedLC)
                : specialAllowed);

              if (!lcIsValid) {
                setSelectedLC(null);
              }

              setAnalysis(nextAnalysis);
        if (nextAnalysis && ["M", "F1", "F2"].includes(nextAnalysis)) {
                setState((s) => ({ ...s, showEntities: hideAllEntities }));
        } else if (nextAnalysis && ["Ve", "UR"].includes(nextAnalysis)) { // Add this condition
                setState((s) => ({ ...s, showEntities: showAllEntities }));
              }
            }}
            selected={analysis}
            disabled={!(simulation?.status === SimulationStatus.Completed && !hasChangedSinceSim && !runInProgress)}
            onClick={() => enableSimulationView()}
          />        </div>
      </div>
      
      {/* Context hint in bottom right corner */}
      <ContextHint 
        message={currentHint} 
        onDismiss={dismissHint}
        persistent={analysis === "UR" || state.isDrawingMember}
      />
    </div>
  );
};

export default DrawingBoard;
