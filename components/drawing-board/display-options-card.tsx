import classNames from "classnames";
import { LoadType, DrawingState } from "./lib/types";
import { RxEyeOpen, RxEyeNone } from "react-icons/rx";
import {
  DeadIcon,
  LiveIcon,
  MomentLoadIcon,
  PointLoadIcon,
  DistributedLoadIcon,
  SnowIcon,
  WindIcon,
  StandardIconDK,
} from "@/lib/constants/icons";
import {
  hideAllEntities,
  isAnyEntityShown,
  showAllEntities,
} from "./lib/show-entities";
import { loadTypeColors } from "@/lib/constants/colors";

const icons: Record<LoadType, React.ComponentType> = {
  [LoadType.Standard]: StandardIconDK,
  [LoadType.Snow]: SnowIcon,
  [LoadType.Wind]: WindIcon,
  [LoadType.Dead]: DeadIcon,
  [LoadType.Live]: LiveIcon,
};

type LoadTypeButtonProps = {
  type: LoadType;
  tooltip: string;
};

type DisplayButtonProps = {
  isSelected: boolean;
  onClick: () => void;
  Icon: React.ComponentType;
  selectedClassName?: string;
  tooltip?: string;
};

const DisplayButton: React.FC<DisplayButtonProps> = ({
  isSelected,
  onClick,
  Icon,
  selectedClassName = "bg-gray-100",
  tooltip,
}) => {
  return (
    <button
      className={classNames("p-2 rounded block", {
        [selectedClassName]: isSelected,
      })}
      onClick={onClick}
      title={tooltip}
    >
      <Icon />
    </button>
  );
};

type DisplayOptionsCardProps = {
  state: DrawingState;
  setState: React.Dispatch<React.SetStateAction<DrawingState>>;
};

const DisplayOptionsCard: React.FC<DisplayOptionsCardProps> = ({
  state,
  setState,
}) => {  const LoadTypeButton: React.FC<LoadTypeButtonProps> = ({
    type,
    tooltip,
  }) => {
    const Icon = icons[type];
    const isSelected = state.showEntities.loadtypeButtons[type];

    return (
      <DisplayButton
        isSelected={isSelected}
        Icon={Icon}
        tooltip={tooltip}
        selectedClassName={loadTypeColors.background[type]}
        onClick={() =>
          setState((s) => ({
            ...s,
            showEntities: {
              ...state.showEntities,
              distributedLoads: {
                ...state.showEntities.distributedLoads,
                [type]: state.showEntities.distributedLoadsButton ? !isSelected : state.showEntities.distributedLoads[type]},
              pointLoads: {
                ...state.showEntities.pointLoads,
                [type]: state.showEntities.pointLoadsButton ? !isSelected : state.showEntities.pointLoads[type]},
              momentLoads: {
                ...state.showEntities.momentLoads,
                [type]: state.showEntities.momentLoadsButton ? !isSelected : state.showEntities.momentLoads[type]},
              loadtypeButtons: {
                ...state.showEntities.loadtypeButtons,
                [type]: !isSelected
            }},
          }))
        }
      />
    );
  };

  const anyEntitiesShown = isAnyEntityShown(state.showEntities);

  const hideAll = () =>
    setState((s) => ({ ...s, showEntities: hideAllEntities }));

  const showAll = () =>
    setState((s) => ({ ...s, showEntities: showAllEntities }));

  return (
    <div
      className="bg-white border rounded flex items-center gap-2 px-3 py-1 text-gray-500 w-full"
      style={{ height: '48px' }} // Ensure consistent height
    >      <DisplayButton
        isSelected={anyEntitiesShown}
        Icon={anyEntitiesShown ? RxEyeOpen : RxEyeNone}
        onClick={anyEntitiesShown ? hideAll : showAll}
        tooltip="Vis/skjul alt"
      />
      <hr className="h-6 border-l border-gray-300 mx-1" />      <DisplayButton
        isSelected={state.showEntities.distributedLoadsButton}
        Icon={DistributedLoadIcon}
        tooltip="Vis/skjul linjelast"
        selectedClassName={classNames(
          loadTypeColors.backgroundLoadsButton,
          "bg-opacity-30"
        )}
        onClick={() => {
          const shouldToggle = !state.showEntities.distributedLoadsButton; // Determine if we are showing or hiding
          setState((s) => ({
            ...s,
            showEntities: {
              ...state.showEntities,
              distributedLoadsButton: shouldToggle, // Toggle the main button state
              distributedLoads: {
                ...state.showEntities.distributedLoads,
                Dead: state.showEntities.loadtypeButtons.Dead ? shouldToggle : state.showEntities.distributedLoads.Dead,
                Live: state.showEntities.loadtypeButtons.Live ? shouldToggle : state.showEntities.distributedLoads.Live,
                Snow: state.showEntities.loadtypeButtons.Snow ? shouldToggle : state.showEntities.distributedLoads.Snow,
                Wind: state.showEntities.loadtypeButtons.Wind ? shouldToggle : state.showEntities.distributedLoads.Wind,
                Standard: state.showEntities.loadtypeButtons.Standard ? shouldToggle : state.showEntities.distributedLoads.Standard,
            },
          },
          }))
        }
        }
      />      <DisplayButton
        isSelected={state.showEntities.pointLoadsButton}
        Icon={PointLoadIcon}
        tooltip="Vis/skjul punktlast"
        selectedClassName={classNames(
          loadTypeColors.backgroundLoadsButton,
          "bg-opacity-30"
        )}
        onClick={() => {
          const shouldToggle = !state.showEntities.pointLoadsButton; // Determine if we are showing or hiding
          setState((s) => ({
            ...s,
            showEntities: {
              ...state.showEntities,
              pointLoadsButton: shouldToggle, // Toggle the main button state
              pointLoads: {
                ...state.showEntities.pointLoads,
                Dead: state.showEntities.loadtypeButtons.Dead ? shouldToggle : state.showEntities.pointLoads.Dead,
                Live: state.showEntities.loadtypeButtons.Live ? shouldToggle : state.showEntities.pointLoads.Live,
                Snow: state.showEntities.loadtypeButtons.Snow ? shouldToggle : state.showEntities.pointLoads.Snow,
                Wind: state.showEntities.loadtypeButtons.Wind ? shouldToggle : state.showEntities.pointLoads.Wind,
                Standard: state.showEntities.loadtypeButtons.Standard ? shouldToggle : state.showEntities.pointLoads.Standard,
            },
          },
          }))
        }
        }
      />      <DisplayButton
        isSelected={state.showEntities.momentLoadsButton}
        Icon={MomentLoadIcon}
        tooltip="Vis/skjul moment"
        selectedClassName={classNames(
          loadTypeColors.backgroundLoadsButton,
          "bg-opacity-30"
        )}
        onClick={() => {
          const shouldToggle = !state.showEntities.momentLoadsButton; // Determine if we are showing or hiding
          setState((s) => ({
            ...s,
            showEntities: {
              ...state.showEntities,
              momentLoadsButton: shouldToggle, // Toggle the main button state
              momentLoads: {
                ...state.showEntities.momentLoads,
                Dead: state.showEntities.loadtypeButtons.Dead ? shouldToggle : state.showEntities.momentLoads.Dead,
                Live: state.showEntities.loadtypeButtons.Live ? shouldToggle : state.showEntities.momentLoads.Live,
                Snow: state.showEntities.loadtypeButtons.Snow ? shouldToggle : state.showEntities.momentLoads.Snow,
                Wind: state.showEntities.loadtypeButtons.Wind ? shouldToggle : state.showEntities.momentLoads.Wind,
                Standard: state.showEntities.loadtypeButtons.Standard ? shouldToggle : state.showEntities.momentLoads.Standard,
            },
          },
          }))
        }
        }
      />
      <hr className="h-6 border-l border-gray-300 mx-1" />
      <LoadTypeButton type={LoadType.Dead} tooltip="Vis/skjul egenlast" />
      <LoadTypeButton type={LoadType.Live} tooltip="Vis/skjul nyttelast" />
      <LoadTypeButton type={LoadType.Snow} tooltip="Vis/skjul snelast" />
      <LoadTypeButton type={LoadType.Wind} tooltip="Vis/skjul vindlast" />
      <LoadTypeButton type={LoadType.Standard} tooltip="Vis/skjul karakteristisk last (uden lastkombination)" />
    </div>
  );
};

export default DisplayOptionsCard;
