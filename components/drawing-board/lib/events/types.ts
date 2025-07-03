import { EntitySet } from "../reduce-history";
import { DrawingState } from "../types";

export type InputEventPayload = {
    id?: string;
    position?: { x: number; y: number };
    clientPosition?: { clientX: number; clientY: number };
    deltaY?: number;
    // Mouse button
    button?: number;
    key?: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
  };

export type InputEvent = {
  type: InputEventType;
  payload?: InputEventPayload;
};

export enum InputEventType {
  CanvasClick = "canvas/click",
  CanvasMouseUp = "canvas/mouseUp",
  CanvasMouseDown = "canvas/mouseDown",
  CanvasMouseMove = "canvas/mouseMove",
  CanvasWheel = "canvas/wheel",
  NodeClick = "node/click",
  MemberClick = "member/click",
  PointLoadClick = "load/point/click",
  DistributedLoadClick = "load/distributed/click",
  MomentLoadClick = "load/moment/click",
  SupportClick = "support/click",
  HotKey = "hotkey",
  CtrlZ = "ctrl+z",
  CtrlShiftZ = "ctrl+shift+z",
  CtrlY = "ctrl+y",
}

export type InputEventHandler = (
  state: DrawingState,
  svgRef: SVGSVGElement | null,
  entitySet: EntitySet,
  e: InputEvent
) => Partial<DrawingState> | null;
