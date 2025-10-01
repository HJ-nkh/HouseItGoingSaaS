import React from "react";
import classNames from "classnames";
import { Card } from "../ui/card"; // Adjust import as needed

type GlobalLocalDefCardProps = {
  selected: "global" | "local";
  setSelected: (val: "global" | "local") => void;
};

const GlobalLocalDefCard: React.FC<GlobalLocalDefCardProps> = ({ selected, setSelected }) => {
  return (
      <Card className="p-2 w-full" style={{ height: "48px" }}>
        <div className="flex h-full">
          <button
            className={classNames(
              "flex-grow p-2 flex items-center justify-center rounded-l font-semibold",
              {
                "bg-gray-100": selected === "local",
                "bg-transparent": selected !== "local",
              }
            )}
            onClick={() => setSelected("local")}
          >
            Lokal
          </button>
          <button
            className={classNames(
              "flex-grow p-2 flex items-center justify-center rounded-r font-semibold",
              {
                "bg-gray-100": selected === "global",
                "bg-transparent": selected !== "global",
              }
            )}
            onClick={() => setSelected("global")}
          >
            Global
          </button>
        </div>
      </Card>
  );
};

export default GlobalLocalDefCard;
