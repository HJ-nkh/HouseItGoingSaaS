import classNames from "classnames";
import { InputEventPayload } from "../../lib/events";
import { ResolvedSupport, SupportType } from "../../lib/types";
import RenderedFixedSupport from "./fixed";
import RenderedPinnedSupport from "./pinned";
import RenderedRollerSupport from "./roller";

export type SupportTypeProps = {
  strokeWidth: number;
  className: string;
  supportId: string;
};

type SupportProps = {
  support: ResolvedSupport;
  isSelected: boolean;
  strokeWidth: number;
  size: number;
  onClick?: (payload: InputEventPayload) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

const RenderedSupport: React.FC<SupportProps> = ({
  support,
  isSelected,
  size,
  strokeWidth,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const point = support.resolved;

  if (!point) {
    return null;
  }

  const className = classNames({
    "stroke-sky-400": isSelected,
    "stroke-black": !isSelected,
  });

  const Icon = () => {
    switch (support.type) {
      case SupportType.Fixed:
        return (
          <RenderedFixedSupport
            strokeWidth={strokeWidth}
            className={className}
            supportId={support.id}
          />
        );
      case SupportType.Pinned:
        return (
          <RenderedPinnedSupport
            strokeWidth={strokeWidth}
            className={className}
            supportId={support.id}
          />
        );
      case SupportType.Roller:
        return (
          <RenderedRollerSupport
            strokeWidth={strokeWidth}
            className={className}
            supportId={support.id}
          />
        );
    }
  };

  const rotation = support.angle;

  return (
    <g transform={`rotate(${rotation} ${point.x} ${point.y})`}>
      <svg
        x={point.x - size / 2}
        y={point.y}
        width={size}
        height={size}
        viewBox="0 0 50 70"
        xmlns="http://www.w3.org/2000/svg"
        className="cursor-pointer"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <rect
          height="100%"
          width="100%"
          fill="transparent"
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.({ id: support.id, ...e });
          }}
        />
          <Icon />
      </svg>
    </g>
  );
};

export default RenderedSupport;
