import { Member } from "./types";

const getNodeOnMember = (
  nodeId: string,
  member: Member
): Member["node1"] | null => {
  if (member.node1.id === nodeId) {
    return member.node1;
  }

  if (member.node2.id === nodeId) {
    return member.node2;
  }

  return null;
};

export default getNodeOnMember;
