import classNames from "classnames";
import { ResolvedPointLoad } from "../lib/types";
import { EntitySet } from "../lib/reduce-history";

type LoadListItemProps = {
  load: ResolvedPointLoad;
  isSelected: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

const LoadListItem: React.FC<LoadListItemProps> = ({
  load,
  isSelected,
  onSelect,
  onMouseEnter,
  onMouseLeave,
}) => {
  return (
    <div
      className={classNames(
        "flex items-center gap-2 mb-1 px-2 py-1 rounded cursor-pointer",
        {
          "bg-gray-100": isSelected,
        }
      )}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="w-8 text-sm">{load.id}</div>

      <div>{load.magnitude}</div>
    </div>
  );
};

type PointLoadListProps = {
  pointLoads: EntitySet["pointLoads"];
  selectedIds: string[];
  onSelectLoad: (id: string) => void;
  hoveringId: string | null;
  setHoveringId: (id: string | null) => void;
};

const PointLoadList: React.FC<PointLoadListProps> = ({
  pointLoads,
  selectedIds,
  onSelectLoad,
  hoveringId,
  setHoveringId,
}) => (
  <>
    <div className="flex gap-2 mb-1 px-2 py-1 font-bold text-sm rounded">
      <div className="w-8">ID</div>
    </div>
    {Object.values(pointLoads).map((load) => (
      <LoadListItem
        key={`list-${load.id}`}
        load={load}
        isSelected={selectedIds.includes(load.id) || hoveringId === load.id}
        onSelect={() => onSelectLoad(load.id)}
        onMouseEnter={() => setHoveringId(load.id)}
        onMouseLeave={() => setHoveringId(null)}
      />
    ))}
  </>
);

export default PointLoadList;
