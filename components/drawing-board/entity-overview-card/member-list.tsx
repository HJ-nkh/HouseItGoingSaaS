import classNames from "classnames";
import { ResolvedMember } from "../lib/types";
import { EntitySet } from "../lib/reduce-history";

type MemberListItemProps = {
  member: ResolvedMember;
  isSelected: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

const MemberListItem: React.FC<MemberListItemProps> = ({
  member,
  isSelected,
  onSelect,
  onMouseEnter,
  onMouseLeave,
}) => {
  return (
    <div
      className={classNames(
        "flex items-center gap-2 mb-1 px-2 py-1 rounded text-sm cursor-pointer",
        {
          "bg-gray-100": isSelected,
        }
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onSelect}
    >
      <div className="w-12">{member.id}</div>
      <div className="w-24">
        {member.node1.id} ({member.node1.assembly})
      </div>
      <div className="w-24">
        {member.node2.id} ({member.node2.assembly})
      </div>
    </div>
  );
};

type MemberListProps = {
  members: EntitySet["members"];
  selectedIds: string[];
  onSelectMember: (id: string) => void;
  hoveringId: string | null;
  setHoveringId: (id: string | null) => void;
};

const MemberList: React.FC<MemberListProps> = ({
  members,
  selectedIds,
  onSelectMember,
  hoveringId,
  setHoveringId,
}) => {
  return (
    <>
      <div
        className={classNames(
          "flex gap-2 mb-1 px-2 py-1 font-bold text-sm rounded",
          {}
        )}
      >
        <div className="w-12">ID</div>
        <div className="w-24">From node</div>
        <div className="w-24">To node</div>
      </div>
      {Object.values(members).map((member) => (
        <MemberListItem
          key={`list-${member.id}`}
          member={member}
          isSelected={
            selectedIds.includes(member.id) || hoveringId === member.id
          }
          onSelect={() => onSelectMember(member.id)}
          onMouseEnter={() => setHoveringId(member.id)}
          onMouseLeave={() => setHoveringId(null)}
        />
      ))}
    </>
  );
};

export default MemberList;
