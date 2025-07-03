import { ResolvedMomentLoad } from "../lib/types";
import { InputEventPayload } from "../lib/events";
import { loadTypeColors } from "@/lib/constants/colors";

type MomentLoadProps = {
  load: ResolvedMomentLoad;
  onClick?: (payload: InputEventPayload) => void;
  isSelected: boolean;
  isHovered: boolean;
  size: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

const RenderedMomentLoad: React.FC<MomentLoadProps> = ({
  load,
  onClick,
  size,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { x, y } = load.resolved;

  const isPositive = load.magnitude && load.magnitude > 0;

  let scaledSize = size * (1.5 + Math.abs(load.magnitude ?? 1));

  let fill = loadTypeColors.fill[load.type];

  if (isHovered) {
    fill = "fill-sky-400";
  }

  if (isSelected) {
    fill = "fill-sky-600";
    scaledSize = scaledSize * 1.2;
  }

  const posX = x - scaledSize / 2;
  const posY = y - scaledSize / 2;

  const mirror = isPositive ? `translate(${scaledSize}, 0) scale(-1, 1)` : "";  return (
    <>
      {/* ATTENTION INDICATOR - Pulsing red circle for loads needing attention - outside transform */}
      {load.needsAttention && (
        <circle
          cx={x}
          cy={y}
          r={scaledSize * 0.5}
          strokeWidth={scaledSize * 0.05}
          className="stroke-red-500 fill-none animate-pulse"
          pointerEvents="none"
        />      )}
      
      {/* CENTER DOT - Shows exact attachment point on member */}
      <circle
        cx={x}
        cy={y}
        r={scaledSize * 0.05}
        className={fill}
        pointerEvents="none"
      />
      
      <g
        transform={`translate(${posX},${posY}) ${mirror}`}
      >
        {/* CLICKABLE AREA */}
      <rect
        height={`${scaledSize}px`}
        width={`${scaledSize}px`}
        fill="transparent"
        className="relative z-40 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          load.id && onClick?.({ id: load.id, ...e });
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
      <svg
      height={`${scaledSize}px`}
      width={`${scaledSize}px`}
      viewBox="0 0 15 15">
        <path
          className={fill}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M1.84998 7.49998C1.84998 4.66458 4.05979 1.84998 7.49998 1.84998C10.2783 1.84998 11.6515 3.9064 12.2367 5H10.5C10.2239 5 10 5.22386 10 5.5C10 5.77614 10.2239 6 10.5 6H13.5C13.7761 6 14 5.77614 14 5.5V2.5C14 2.22386 13.7761 2 13.5 2C13.2239 2 13 2.22386 13 2.5V4.31318C12.2955 3.07126 10.6659 0.849976 7.49998 0.849976C3.43716 0.849976 0.849976 4.18537 0.849976 7.49998C0.849976 10.8146 3.43716 14.15 7.49998 14.15C9.44382 14.15 11.0622 13.3808 12.2145 12.2084C12.8315 11.5806 13.3133 10.839 13.6418 10.0407C13.7469 9.78536 13.6251 9.49315 13.3698 9.38806C13.1144 9.28296 12.8222 9.40478 12.7171 9.66014C12.4363 10.3425 12.0251 10.9745 11.5013 11.5074C10.5295 12.4963 9.16504 13.15 7.49998 13.15C4.05979 13.15 1.84998 10.3354 1.84998 7.49998Z"
        />      </svg>
    </g>
    </>
  );
};

export default RenderedMomentLoad;
