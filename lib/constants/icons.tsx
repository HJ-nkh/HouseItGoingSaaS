import {
  RxArrowDown,
  RxBorderSolid,
  RxDotFilled,
  RxReload,
} from "react-icons/rx";
import { BsSnow } from "react-icons/bs";
import { PiWindLight } from "react-icons/pi";
import { LiaWeightHangingSolid } from "react-icons/lia";
import { BsUniversalAccess } from "react-icons/bs";
import { TbHandFinger } from "react-icons/tb";

export const SelectIcon = TbHandFinger;

export const NodeIcon = RxDotFilled;

export const MemberIcon = RxBorderSolid;

export const PointLoadIcon = RxArrowDown;

export const DistributedLoadIcon = () => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 50 50"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    fill="currentColor"
  >
    <line x1="10" y1="5" x2="40" y2="5" strokeWidth="3" />
    <line x1="10" y1="5" x2="10" y2="45" strokeWidth="3" />
    <line x1="40" y1="5" x2="40" y2="45" strokeWidth="3" />

    <line x1="0" y1="35" x2="10" y2="45" strokeWidth="3" />
    <line x1="20" y1="35" x2="10" y2="45" strokeWidth="3" />

    <line x1="50" y1="35" x2="40" y2="45" strokeWidth="3" />
    <line x1="30" y1="35" x2="40" y2="45" strokeWidth="3" />
  </svg>
);

export const MomentLoadIcon = () => (
  <RxReload style={{ transform: "scaleX(-1)" }} />
);

export const SupportIcon = () => (
  <svg
    height="1em"
    width="1em"
    viewBox="0 0 50 50"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polygon
      points="25,0 50,36 0,36"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    />
    <circle
      cx="12"
      cy="43"
      r="7"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    />
    <circle
      cx="38"
      cy="43"
      r="7"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    />
  </svg>
);

export const SnowIcon = BsSnow;

export const WindIcon = PiWindLight;

export const LiveIcon = BsUniversalAccess;

export const StandardIconDK = () => {
  return (
    <svg
      stroke="currentColor"
      viewBox="0 0 256 256"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <style type="text/css">
          {`
            @font-face {
              font-family: 'Quicksand';
              font-style: normal;
              font-weight: 700;
              src: url(data:font/woff2;charset=utf-8;base64,d09GMgABAAAAAAmQABAAAAAABAQAAA...); /* Replace with full base64 */
            }
            .quicksand {
              font-family: 'Quicksand', sans-serif;
              font-weight: 700;
            }
          `}
        </style>
      </defs>
      <text
        x="133" // Center X position
        y="152" // Center Y position
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="240" // Adjust the font size as needed
        fill="currentColor"
        className="quicksand"
      >
        K
      </text>
    </svg>
  );
};

export const DeadIcon = LiaWeightHangingSolid;
