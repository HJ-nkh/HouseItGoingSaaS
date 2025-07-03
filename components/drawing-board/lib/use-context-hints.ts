import { useState, useEffect } from "react";
import { DrawingState, Tool } from "./types";
import { Analysis } from "@/lib/types";

type HintConfig = {
  message: string;
  trigger: (state: DrawingState, analysis: Analysis | null, showSimulation: boolean) => boolean;
  id: string;
  persistent?: boolean;
};

const hints: HintConfig[] = [
  {
    id: "utilization-select-member",
    message: "Vælg konstruktionsdel for at se detaljerede udnyttelser",
    trigger: (state, analysis, showSimulation) => 
      showSimulation && analysis === "UR" && state.selectedIds.length === 0,
    persistent: true,
  },
  {
    id: "deflection-view-active",
    message: "Udbøjninger vises nu på konstruktionen",
    trigger: (_, analysis, showSimulation) => 
      showSimulation && analysis === "Ve",
  },
  {
    id: "moment-view-active", 
    message: "Moment vises nu på konstruktionen. Hold musen over for at se detaljerede værdier",
    trigger: (_, analysis, showSimulation) => 
      showSimulation && analysis === "M",
  },
  {
    id: "shear-view-active",
    message: "Forskydning vises nu på konstruktionen. Hold musen over for at se detaljerede værdier", 
    trigger: (_, analysis, showSimulation) => 
      showSimulation && analysis === "F2",
  },
  {
    id: "normal-view-active",
    message: "Normalskraft vises nu på konstruktionen. Hold musen over for at se detaljerede værdier",
    trigger: (_, analysis, showSimulation) => 
      showSimulation && analysis === "F1",
  },
  {
    id: "reactions-view-active",
    message: "Reaktioner vises nu på konstruktionen",
    trigger: (_, analysis, showSimulation) => 
      showSimulation && analysis === "R0",
  },
  {
    id: "member-tool-hint",
    message: "Klik for at starte en ny konstruktionsdel. Klik på eksisterende konstruktionsdel for at forbinde derfra. Hold Alt nede for at snappe til grid.",
    trigger: (state, _, showSimulation) => 
      !showSimulation && state.tool === Tool.Member && !state.isDrawingMember,
  },
  {
    id: "drawing-member-hint", 
    message: "Klik for at afslutte konstruktionsdel. Tryk Esc for at annullere",
    trigger: (state, _, showSimulation) => 
      !showSimulation && state.tool === Tool.Member && state.isDrawingMember,
    persistent: true,
  },
  {
    id: "support-tool-hint",
    message: "Klik på konstruktionsdel eller knude for at tilføje understøtning",
    trigger: (state, _, showSimulation) => 
      !showSimulation && state.tool === Tool.Support,
  },  {
    id: "select-tool-config-model",
    message: "Tryk på ønskede konstruktionsdele, knuder, understøtninger eller laster for at konfigurere dem",
    trigger: (state, _, showSimulation) => 
      !showSimulation && state.tool === Tool.Select && state.selectedIds.length === 0,
  },
  {
    id: "select-tool-multi-select",
    message: "Hold Ctrl nede for at tilpasse flere konstruktionsdele ad gangen",
    trigger: (state, _, showSimulation) => 
      !showSimulation && state.tool === Tool.Select && state.selectedIds.length === 1,
  },
  {
    id: "load-tool-hint",
    message: "Klik på konstruktionsdel eller knude for at tilføje last",
    trigger: (state, _, showSimulation) => 
      !showSimulation && [Tool.PointLoad, Tool.MomentLoad].includes(state.tool),
  },
{
    id: "dist-load-tool-hint",
    message: "Klik på konstruktionsdel for at tilføje last",
    trigger: (state, _, showSimulation) => 
      !showSimulation && [Tool.DistributedLoad].includes(state.tool),
  },
];

export const useContextHints = (
  state: DrawingState, 
  analysis: Analysis | null, 
  showSimulation: boolean
) => {
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Find the first matching hint that hasn't been dismissed
    const activeHint = hints.find(hint => 
      !dismissedHints.has(hint.id) && hint.trigger(state, analysis, showSimulation)
    );

    setCurrentHint(activeHint?.message || null);
  }, [state, analysis, showSimulation, dismissedHints]);

  const dismissHint = () => {
    const activeHint = hints.find(hint => 
      hint.trigger(state, analysis, showSimulation)
    );
    
    if (activeHint) {
      setDismissedHints(prev => new Set([...prev, activeHint.id]));
    }
    
    setCurrentHint(null);
  };

  return {
    currentHint,
    dismissHint,
  };
};
