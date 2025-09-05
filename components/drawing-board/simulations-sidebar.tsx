import classNames from "classnames";
import { Analysis } from "@/lib/types";

type SimulationsSidebarProps = {
  onSelect: (analysis: Analysis) => void;
  selected: Analysis | null;
  disabled?: boolean;
  onClick?: () => void;
};

type AnalysisButtonProps = {
  analysis: Analysis;
  label?: string;
  tooltip?: string;
};

const buttonSelectedClassName = "bg-gray-100";
const disabledClassName = "text-gray-400";

const buttonClassName =
  "p-2 rounded block mb-1 font-semibold w-full text-center";

const SimulationsSidebar: React.FC<SimulationsSidebarProps> = ({
  onSelect,
  selected,
  disabled,
  onClick,
}) => {  const AnalysisButton: React.FC<AnalysisButtonProps> = ({ analysis, label, tooltip }) => {
    return (
      <button
        className={classNames(buttonClassName, {
          [disabledClassName]: disabled,
          [buttonSelectedClassName]: selected === analysis,
        })}
        disabled={disabled}
        onClick={() => !disabled && onSelect(analysis)}
        title={tooltip}
      >
        {label || analysis}
      </button>
    );
  };
  return (
    <div className="py-2 px-1 h-full border-l bg-white" onClick={onClick}>
      <AnalysisButton key="UR" analysis="UR" label="%" tooltip="Udnyttelser" />
      <hr className="my-3 mx-1" />
      <AnalysisButton key="Ve" analysis="Ve" label="u" tooltip="Udbøjninger" />
      <hr className="my-3 mx-1" />
      <AnalysisButton key="M" analysis="M" label="M" tooltip="Moment" />
      <AnalysisButton key="F2" analysis="F2" label="V" tooltip="Forskydning" />
      <AnalysisButton key="F1" analysis="F1" label="N" tooltip="Normal" />
      <hr className="my-3 mx-1" />
      <AnalysisButton key="R0" analysis="R0" label="R" tooltip="Reaktion" />
    </div>
  );
};

export default SimulationsSidebar;
