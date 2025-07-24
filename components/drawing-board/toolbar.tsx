import classNames from "classnames";
import { Tool } from "./lib/types";
import { toolIcons } from "./lib/tool-icons";

type ToolbarProps = {
  onSelect: (tool: Tool) => void;
  selected: Tool;
  disabled?: boolean;
  onClick?: () => void;
};

type ToolButtonProps = {
  tool: Tool;
};

const toolSelectedClassName = "bg-gray-100";
const disabledClassName = "bg-transparent";

const toolClassName = "cursor-pointer p-2 rounded block mb-1";

// Danish tooltips for each tool
const toolTooltips: Record<Tool, string> = {
  [Tool.Select]: "Konfigurer (ESC)",
  [Tool.Node]: "Indsæt knude (N)",
  [Tool.Member]: "Tegn konstruktionsdel (K)",
  [Tool.Support]: "Indsæt understøtninger (U)",
  [Tool.DistributedLoad]: "Linjelast (L)",
  [Tool.PointLoad]: "Punktlast (P)",
  [Tool.MomentLoad]: "Moment (M)",
  [Tool.WindCalculator]: "Vindlastberegner (V)",
};

const Toolbar: React.FC<ToolbarProps> = ({
  onSelect,
  selected,
  disabled,
  onClick,
}) => {  const ToolButton: React.FC<ToolButtonProps> = ({ tool }) => {
    const Icon = toolIcons[tool];

    return (
      <button
        className={classNames(toolClassName, {
          [toolSelectedClassName]: selected === tool,
          [disabledClassName]: disabled,
        })}
        onClick={() => onSelect(tool)}
        title={toolTooltips[tool]}
      >
        <Icon />
      </button>
    );
  };

  return (
    <div className="p-1 h-full border-r bg-white" onClick={onClick}>
      <ToolButton key={Tool.Select} tool={Tool.Select} />
      <hr className="my-4 mx-1" />
      <ToolButton key={Tool.Member} tool={Tool.Member} />
      <hr className="my-4 mx-1" />
      <ToolButton key={Tool.Support} tool={Tool.Support} />
      <hr className="my-4 mx-1" />
      <ToolButton key={Tool.DistributedLoad} tool={Tool.DistributedLoad} />
      <ToolButton key={Tool.PointLoad} tool={Tool.PointLoad} />
      <ToolButton key={Tool.MomentLoad} tool={Tool.MomentLoad} />
      <hr className="my-4 mx-1" />
      <ToolButton key={Tool.WindCalculator} tool={Tool.WindCalculator} />
    </div>
  );
};

export default Toolbar;
