import classNames from "classnames";
import { ResolvedNode } from "../lib/types";
import { EntitySet } from "../lib/reduce-history";

type NodeListItemProps = {
  node: ResolvedNode;
  isSelected: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

const NodeListItem: React.FC<NodeListItemProps> = ({
  node,
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
      <div className="w-8 text-sm">{node.id}</div>
      <div className="w-12">{node.resolved.x.toFixed(2)}</div>
      <div className="w-12">{node.resolved.y.toFixed(2)}</div>
    </div>
  );
};

type NodeListProps = {
  nodes: EntitySet["nodes"];
  selectedIds: string[];
  onSelectNode: (id: string) => void;
  hoveringId: string | null;
  setHoveringId: (id: string | null) => void;
};

const NodeList: React.FC<NodeListProps> = ({
  nodes,
  selectedIds,
  onSelectNode,
  hoveringId,
  setHoveringId,
}) => (
  <>
    <div className="flex gap-2 mb-1 px-2 py-1 font-bold text-sm rounded">
      <div className="w-8">ID</div>
      <div className="w-12">X</div>
      <div className="w-12">Y</div>
    </div>
    {Object.values(nodes).map((node) => (
      <NodeListItem
        key={`list-${node.id}`}
        node={node}
        isSelected={selectedIds.includes(node.id) || hoveringId === node.id}
        onSelect={() => onSelectNode(node.id)}
        onMouseEnter={() => setHoveringId(node.id)}
        onMouseLeave={() => setHoveringId(null)}
      />
    ))}
  </>
);

export default NodeList;
