import { useState } from "react";
import { Drawing } from "@/types";
import { DrawingState } from "./lib/types";
import { useParams } from "@/router";
import Input from "../input";
import { RxArchive, RxTrash, RxVercelLogo } from "react-icons/rx";
import { EntitySet } from "./lib/reduce-history";
import { useCreateSimulation } from "@/api/simulations";
import { Button } from "../ui/button";
import WithConfirmation from "../with-confirmation";
import { isValidDrawing } from "./lib/validate-drawing";
import { flipYAxisOnResolvedEntities } from "./lib/flip-y-axis";
import { useQueryClient } from "react-query";
import { BiDownload } from "react-icons/bi"; // new import added
import { useCreateReport, useSimulationReport } from "@/api/reports";
import API from "@/api";
import { downloadFile } from "@/lib/utils";

const downloadReport = async (reportId: string) => {
  const res = API.get({
    apiName: import.meta.env.VITE_API_NAME,
    path: `/reports/${reportId}/download-url`,
  });
  const response = await res.response;
  if (response.body.status >= 300) {
    const payload = await response.body.json();
    throw new Error(payload.detail ?? response.body.statusText);
  }
  const url = await response.body.json();
  downloadFile(url, `report-${reportId}.docx`);
};

type TopBarProps = {
  drawing?: Drawing;
  onSave: (drawing: Partial<Drawing>) => void;
  onDelete?: () => void;
  entitySet: EntitySet;
  state: DrawingState;
  simulationId?: string;
  showDownload?: boolean; // new prop added
};

const TopBar: React.FC<TopBarProps> = ({
  drawing,
  onSave,
  onDelete,
  entitySet,
  state,
  simulationId,
  showDownload = false, // new prop added
}) => {
  const { projectId } = useParams("/projects/:projectId/draw/:drawingId");
  const [title, setTitle] = useState(drawing?.title ?? "Min fusion-model");
  const queryClient = useQueryClient();

  const { mutate: createSimulation, isLoading: isCreatingSimulation } = useCreateSimulation({
    onSuccess: () =>
      queryClient.refetchQueries(`latestSimulation/${drawing?.id}`),
  });
  
  const { data: reportData } = useSimulationReport(simulationId);

  const { mutate: createReport, isLoading: isCreatingReport } = useCreateReport({
    onSuccess: (reportData) => {
      downloadReport(reportData.id);
    },
  })
  
  const validation = isValidDrawing(entitySet);

  return (
    <div className="w-full flex items-center justify-between p-2 border-b bg-white">
      <div>
        <Input value={title} onChange={setTitle} />
      </div>
      <div className="flex items-center gap-2">
        {!validation.ok && (
          <div className="text-red-500 italic mr-2">{validation.error}</div>
        )}
        {drawing && (
          <>
            {showDownload && simulationId && (
              <Button
                variant="default"
                className="w-24 bg-blue-700" // updated to a darker blue
                disabled={isCreatingSimulation || isCreatingReport || !title || !validation.ok}
                onClick={async () => {
                  if (reportData) {
                    downloadReport(reportData.id);
                  }

                  createReport({
                      simulationId
                  });
                }}
              >
                <BiDownload className="mr-1 text-2xl" /> Dok
              </Button>
            )}
            <Button
              variant="default"
              className="w-24 bg-emerald-600"
              disabled={isCreatingSimulation || !title || !validation.ok}              onClick={() => {
                if (!drawing) {
                  return;
                }

                onSave({ title, history: state.history, projectId, hasChanges: false });

                createSimulation({
                  projectId,
                  drawingId: drawing?.id,
                  entities: flipYAxisOnResolvedEntities(entitySet),
                });
                
              }}
            >
              <RxVercelLogo className="transform rotate-90 mr-1" /> Kør
            </Button>
          </>
        )}
        <Button
          variant="outline"
          className="w-24"
          onClick={() =>
            onSave({
              title,
              history: state.history,
              projectId,
              hasChanges: state.hasChanges,
            })
          }
        >
          <RxArchive className="mr-1" /> Gem
        </Button>
        {onDelete && (
          <WithConfirmation>
            <Button
              variant="outline"
              className="w-24 border-red-500 text-red-500"
              onClick={() => onDelete()}
            >
              <RxTrash className="mr-1 h-4 w-4" /> Slet
            </Button>
          </WithConfirmation>
        )}
      </div>
    </div>
  );
};

export default TopBar;
