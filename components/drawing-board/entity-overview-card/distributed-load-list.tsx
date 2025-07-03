import classNames from "classnames";
import { ResolvedDistributedLoad } from "../lib/types";
import { EntitySet } from "../lib/reduce-history";

type LoadListItemProps = {
  load: ResolvedDistributedLoad;
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

      <div className="w-20">
        {load.magnitude1} - {load.magnitude2}
      </div>
    </div>
  );
};

type DistributedLoadListProps = {
  distributedLoads: EntitySet["distributedLoads"];
  selectedIds: string[];
  onSelectLoad: (id: string) => void;
  hoveringId: string | null;
  setHoveringId: (id: string | null) => void;
};

const DistributedLoadList: React.FC<DistributedLoadListProps> = ({
  distributedLoads,
  selectedIds,
  onSelectLoad,
  hoveringId,
  setHoveringId,
}) => (
  <>
    <div className="flex gap-2 mb-1 px-2 py-1 font-bold text-sm rounded">
      <div className="w-8">ID</div>
    </div>
    {Object.values(distributedLoads).map((load) => (
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

export default DistributedLoadList;
