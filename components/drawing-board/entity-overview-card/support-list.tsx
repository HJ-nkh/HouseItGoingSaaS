import classNames from "classnames";
import { ResolvedSupport } from "../lib/types";
import { EntitySet } from "../lib/reduce-history";

type SupportListItemProps = {
  support: ResolvedSupport;
  isSelected: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

const SupportListItem: React.FC<SupportListItemProps> = ({
  support,
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
      <div className="w-8 text-sm">{support.id}</div>

      <div>{support.type}</div>
      <div>{support.onNode?.id ?? support.onMember?.id}</div>
      <div>{support.angle}</div>
    </div>
  );
};

type SupportListProps = {
  supports: EntitySet["supports"];
  selectedIds: string[];
  onSelect: (id: string) => void;
  hoveringId: string | null;
  setHoveringId: (id: string | null) => void;
};

const SupportList: React.FC<SupportListProps> = ({
  supports,
  selectedIds,
  onSelect,
  hoveringId,
  setHoveringId,
}) => (
  <>
    <div className="flex gap-2 mb-1 px-2 py-1 font-bold text-sm rounded">
      <div className="w-8">ID</div>
    </div>
    {Object.values(supports).map((support) => (
      <SupportListItem
        key={`list-${support.id}`}
        support={support}
        isSelected={
          selectedIds.includes(support.id) || hoveringId === support.id
        }
        onSelect={() => onSelect(support.id)}
        onMouseEnter={() => setHoveringId(support.id)}
        onMouseLeave={() => setHoveringId(null)}
      />
    ))}
  </>
);

export default SupportList;
