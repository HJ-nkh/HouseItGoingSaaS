import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DrawingState, Entity } from "../lib/types";
import classNames from "classnames";
import NodeList from "./node-list";
import MemberList from "./member-list";
import { ChevronLeft } from "lucide-react";
import { EntitySet } from "../lib/reduce-history";
import PointLoadList from "./point-load-list";
import DistributedLoadList from "./distributed-load-list";
import MomentLoadList from "./moment-load-list";
import SupportList from "./support-list";

type ViewProps = {
  entity: Entity;
  entitySet: EntitySet;
  selectedIds: string[];
  hoveringId: string | null;
  setHoveringId: (id: string | null) => void;
};

const View: React.FC<ViewProps> = ({
  entity,
  entitySet,
  selectedIds,
  hoveringId,
  setHoveringId,
}) => {
  switch (entity) {
    case Entity.Node:
      return (
        <NodeList
          nodes={entitySet.nodes}
          selectedIds={selectedIds}
          hoveringId={hoveringId}
          onSelectNode={() => null}
          setHoveringId={setHoveringId}
        />
      );
    case Entity.Member:
      return (
        <MemberList
          members={entitySet.members}
          selectedIds={selectedIds}
          onSelectMember={() => null}
          setHoveringId={setHoveringId}
          hoveringId={hoveringId}
        />
      );
    case Entity.PointLoad:
      return (
        <PointLoadList
          pointLoads={entitySet.pointLoads}
          selectedIds={selectedIds}
          onSelectLoad={() => null}
          setHoveringId={setHoveringId}
          hoveringId={hoveringId}
        />
      );
    case Entity.DistributedLoad:
      return (
        <DistributedLoadList
          distributedLoads={entitySet.distributedLoads}
          selectedIds={selectedIds}
          onSelectLoad={() => null}
          setHoveringId={setHoveringId}
          hoveringId={hoveringId}
        />
      );
    case Entity.MomentLoad:
      return (
        <MomentLoadList
          momentLoads={entitySet.momentLoads}
          selectedIds={selectedIds}
          onSelectLoad={() => null}
          setHoveringId={setHoveringId}
          hoveringId={hoveringId}
        />
      );
    case Entity.Support:
      return (
        <SupportList
          supports={entitySet.supports}
          selectedIds={selectedIds}
          onSelect={() => null}
          setHoveringId={setHoveringId}
          hoveringId={hoveringId}
        />
      );
    default:
      return null;
  }
};

type MenuItemProps = {
  entity: Entity;
  setEntity: (entity: Entity | undefined) => void;
  label: string;
  isSelected: boolean;
};

const MenuItem: React.FC<MenuItemProps> = ({
  entity,
  setEntity,
  label,
  isSelected,
}) => (
  <div className="mb-1">
    <button
      onClick={() => (isSelected ? setEntity(undefined) : setEntity(entity))}
      className={classNames("w-36 text-sm text-left px-2 py-1 rounded", {
        "bg-gray-100": isSelected,
      })}
    >
      {label}
    </button>
  </div>
);

type EntityOverviewCardProps = {
  entitySet: EntitySet;
  state: DrawingState;
  setState: React.Dispatch<React.SetStateAction<DrawingState>>;
};

const EntityOverviewCard: React.FC<EntityOverviewCardProps> = ({
  entitySet,
  state,
  setState,
}) => {
  const [selectedEntity, setSelectedEntity] = useState<Entity>();

  return (
    <div className="relative">
      <Card>
        <CardContent className="pt-4">
          <MenuItem
            entity={Entity.Node}
            setEntity={setSelectedEntity}
            isSelected={selectedEntity === Entity.Node}
            label="Nodes"
          />
          <MenuItem
            entity={Entity.Member}
            setEntity={setSelectedEntity}
            isSelected={selectedEntity === Entity.Member}
            label="Members"
          />
          <MenuItem
            entity={Entity.PointLoad}
            setEntity={setSelectedEntity}
            isSelected={selectedEntity === Entity.PointLoad}
            label="Point loads"
          />
          <MenuItem
            entity={Entity.DistributedLoad}
            setEntity={setSelectedEntity}
            isSelected={selectedEntity === Entity.DistributedLoad}
            label="Distributed loads"
          />
          <MenuItem
            entity={Entity.MomentLoad}
            setEntity={setSelectedEntity}
            isSelected={selectedEntity === Entity.MomentLoad}
            label="Moment loads"
          />
          <MenuItem
            entity={Entity.Support}
            setEntity={setSelectedEntity}
            isSelected={selectedEntity === Entity.Support}
            label="Supports"
          />
        </CardContent>
      </Card>
      {selectedEntity && (
        <div className="absolute top-0 left-40 pl-2">
          <Card className="p-2 pt-3 pr-3 relative">
            <button
              onClick={() => setSelectedEntity(undefined)}
              className="absolute top-0.5 right-0.5 hover:bg-gray-100 rounded-sm"
            >
              <ChevronLeft className="h-4 w-4 p-0.5" />
            </button>
            <View
              entity={selectedEntity}
              entitySet={entitySet}
              selectedIds={state.selectedIds}
              hoveringId={state.hoveringId}
              setHoveringId={(id) =>
                setState((s) => ({ ...s, hoveringId: id }))
              }
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default EntityOverviewCard;
