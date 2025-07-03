import { IconType } from "react-icons";
import {
  MemberIcon,
  NodeIcon,
  SelectIcon,
  PointLoadIcon,
  DistributedLoadIcon,
  MomentLoadIcon,
  SupportIcon,
} from "@/constants/icons";
import { Tool } from "./types";
import { renderToString } from "react-dom/server";

export const toolIcons: Record<Tool, IconType> = {
  Select: SelectIcon,
  Node: NodeIcon,
  Member: MemberIcon,
  PointLoad: PointLoadIcon,
  DistributedLoad: DistributedLoadIcon,
  MomentLoad: MomentLoadIcon,
  Support: SupportIcon,
};

export const toBase64String = (Component: React.ComponentType): string => {
  const htmlString = renderToString(<Component />);
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg">${htmlString}</svg>`;
  return btoa(svgString);
};
