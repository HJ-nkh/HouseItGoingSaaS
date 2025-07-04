import { useState } from "react";
import { Drawing } from "@/lib/types";
import { DrawingState } from "./lib/types";
import Input from "../input";
import { EntitySet } from "./lib/reduce-history";
import { Button } from "../ui/button";
import WithConfirmation from "../with-confirmation";
import { isValidDrawing } from "./lib/validate-drawing";
import { flipYAxisOnResolvedEntities } from "./lib/flip-y-axis";
// import { useCreateReport, useSimulationReport } from "@/lib/api/reports";
import { downloadFile } from "@/lib/utils";
import { CreateDrawingData, useReportMutations, useReports, useSimulationMutations } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Download, Triangle, Archive, Trash2 } from "lucide-react";
import { RxChevronLeft } from "react-icons/rx";

type TopBarProps = {
  drawing?: Drawing | null;
  onSave: (drawing: CreateDrawingData) => void;
  onDelete?: () => void;
  entitySet: EntitySet;
  state: DrawingState;
  simulationId?: string;
  showDownload?: boolean;
};

const TopBar: React.FC<TopBarProps> = ({
  drawing,
  onSave,
  onDelete,
  entitySet,
  state,
  simulationId,
  showDownload = false,
}) => {
  const params = useParams();
  const projectId = params.id as string;
  const [title, setTitle] = useState(drawing?.title ?? "Min fusion-model");

  const router = useRouter();

  const simulationMutations = useSimulationMutations();
  const reportMutations = useReportMutations();

const downloadReport = async (reportId: string) => {
  const { downloadUrl } = await reportMutations.getDownloadUrl(reportId);
  downloadFile(downloadUrl, `report-${reportId}.docx`);
};

  const { reports } = useReports({}, { simulationId });
  
  const validation = isValidDrawing(entitySet);

  return (
    <div className="w-full flex items-center justify-between p-2 border-b bg-white">
      <div className="flex items-center gap-2">
        <div className="rounded hover:bg-gray-100 p-1 cursor-pointer" onClick={() => router.push(`/projects/${projectId}`)}>
          <RxChevronLeft className="text-2xl" />
        </div>
        <div>
          <Input value={title} onChange={setTitle} />
        </div>
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
                disabled={simulationMutations.loading || reportMutations.loading || !title || !validation.ok}
                onClick={async () => {
                  const report = reports[0];
                  if (report) {
                    downloadReport(report.id);
                    return;
                  }

                  reportMutations.createReport({
                      simulationId
                  });
                }}
              >
                <Download className="mr-1 text-2xl" /> Dok
              </Button>
            )}
            <Button
              variant="default"
              className="w-24 bg-emerald-600"
              disabled={simulationMutations.loading || !title || !validation.ok}              onClick={() => {
                if (!drawing) {
                  return;
                }

                onSave({ title, history: state.history, projectId, hasChanges: false });

                simulationMutations.createSimulation({
                  projectId,
                  drawingId: drawing?.id,
                  entities: flipYAxisOnResolvedEntities(entitySet),
                });
                
              }}
            >
              <Triangle className="transform rotate-90 mr-1" /> Kør
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
          <Archive className="mr-1" /> Gem
        </Button>
        {onDelete && (
          <WithConfirmation>
            <Button
              variant="outline"
              className="w-24 border-red-500 text-red-500"
              onClick={() => onDelete()}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Slet
            </Button>
          </WithConfirmation>
        )}
      </div>
    </div>
  );
};

export default TopBar;
