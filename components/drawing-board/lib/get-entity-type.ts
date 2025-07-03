import { Entity } from "./types";

const getEntityType = (id: string): Entity => {
  if (id.startsWith("pl")) {
    return Entity.PointLoad;
  }

  if (id.startsWith("dl")) {
    return Entity.DistributedLoad;
  }

  if (id.startsWith("ml")) {
    return Entity.MomentLoad;
  }

  if (id.startsWith("n")) {
    return Entity.Node;
  }

  if (id.startsWith("m")) {
    return Entity.Member;
  }

  if (id.startsWith("s")) {
    return Entity.Support;
  }

  throw new Error("Invalid entity id");
};

export default getEntityType;
