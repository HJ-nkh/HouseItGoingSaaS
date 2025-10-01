import { useEffect, useState } from "react";
import { Drawing } from "@/lib/types";
import { DrawingState } from "./lib/types";
import Input from "../input";
import { Select } from "../select";
import { EntitySet } from "./lib/reduce-history";
import { Button } from "../ui/button";
import WithConfirmation from "../with-confirmation";
import { isValidDrawing } from "./lib/validate-drawing";
import { flipYAxisOnResolvedEntities } from "./lib/flip-y-axis";
// import { useCreateReport, useSimulationReport } from "@/lib/api/reports";
import { downloadFile } from "@/lib/utils";
import { CreateDrawingData, useReportMutations, useReports } from "@/lib/api";
import { useSimulationMutations } from "@/lib/api/use-simulations";
import { useParams, useRouter } from "next/navigation";
import { Download, Triangle, Archive, Trash2, Loader2 } from "lucide-react";
import { RxChevronLeft } from "react-icons/rx";

type TopBarProps = {
  drawing?: Drawing | null;
  onSave: (drawing: CreateDrawingData) => void;
  onDelete?: () => void;
  entitySet: EntitySet;
  state: DrawingState;
  simulationId?: string;
  showDownload?: boolean;
  // Called right after a simulation has been queued/created; parent can refetch
  onSimulationQueued?: () => void;
  // Called immediately when user clicks Run, before any network calls
  onRunStart?: () => void;
  // Called with the new simulation id as soon as it's created
  onSimulationCreated?: (simulationId: string) => void;
};

const TopBar: React.FC<TopBarProps> = ({
  drawing,
  onSave,
  onDelete,
  entitySet,
  state,
  simulationId,
  showDownload = false,
  onSimulationQueued,
  onRunStart,
  onSimulationCreated,
}) => {
  const params = useParams();
  const projectId = params.projectId as string;
  const [title, setTitle] = useState(drawing?.title ?? "Min fusion-model");
  const [consequenceClass, setConsequenceClass] = useState<'CC1'|'CC2'|'CC3'>(
    (drawing?.consequenceClass as any) ?? 'CC2'
  );
  const [robustnessFactor, setRobustnessFactor] = useState<boolean>(
    !!drawing?.robustnessFactor
  );

  useEffect(() => {
    if (drawing?.consequenceClass) {
      setConsequenceClass(drawing.consequenceClass as any);
    }
    if (drawing?.title) {
      setTitle(drawing.title);
    }
    setRobustnessFactor(!!drawing?.robustnessFactor);
  }, [drawing?.consequenceClass, drawing?.title]);

  const router = useRouter();

  const simulationMutations = useSimulationMutations();
  const reportMutations = useReportMutations();

  const makeFilename = () => {
    const raw = (drawing?.title || title || 'rapport').trim();
    return raw
      .replace(/\s+/g, '-')      // spaces -> dashes
      .replace(/[^A-Za-z0-9.-]+/g, '') // strip other chars
      || 'rapport';
  };

  const downloadReport = async (reportId: string) => {
    const { downloadUrl, filename } = await reportMutations.getDownloadUrl(reportId) as any;
    downloadFile(downloadUrl, filename || `${makeFilename()}.docx`);
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
        <div className="ml-2">
          <Select
            value={consequenceClass}
            onChange={(v) => setConsequenceClass((v as any) ?? 'CC2')}
            options={[
              { label: (
                <span>
                  CC1 (
                  <span>
                    <span className="italic">K</span>
                    <sub>FI</sub> = 0,9
                  </span>
                  )
                </span>
              ), value: 'CC1' },
              { label: (
                <span>
                  CC2 (
                  <span>
                    <span className="italic">K</span>
                    <sub>FI</sub> = 1,0
                  </span>
                  )
                </span>
              ), value: 'CC2' },
              { label: (
                <span>
                  CC3 (
                  <span>
                    <span className="italic">K</span>
                    <sub>FI</sub> = 1,1
                  </span>
                  )
                </span>
              ), value: 'CC3' },
            ]}
            placeholder="Konsekvensklasse"
            className="w-fit"
          />
        </div>
  <div className="ml-2 flex items-center gap-2">
          <span className="text-sm text-gray-700 hidden sm:inline" title="Robusthedsfaktor (γ_M · 1,2)">
            Robusthed
            <span className="ml-1 text-gray-500">(
              <span className="italic">γ</span><sub>M</sub> · 1,2)
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={robustnessFactor}
            onClick={() => setRobustnessFactor((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              robustnessFactor ? "bg-sky-500" : "bg-gray-300"
            }`}
            title="Robusthedsfaktor (γ_M · 1,2)"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                robustnessFactor ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-xs text-gray-500 select-none min-w-6">
            {robustnessFactor ? "til" : "fra"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!validation.ok && (
          <div className="text-red-500 italic mr-2">{validation.error}</div>
        )}
        {drawing && (
          <>
            {reportMutations.loading && (
              <div className="text-sm text-gray-500 italic flex items-center gap-2 mr-1">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span>
                  Dokumentation udarbejdes – dette kan tage lidt tid. Du kan fortsætte arbejdet imens.
                </span>
              </div>
            )}
            {showDownload && simulationId && (
              <Button
                variant="default"
                className="w-24 bg-blue-700" // updated to a darker blue
                disabled={simulationMutations.loading || reportMutations.loading || !title || !validation.ok}
                onClick={async () => {
                  const report = reports[0];
                  let reportId = report?.id;

                  if (!reportId) {
                    const res = await reportMutations.createReport({ simulationId, title });
                    reportId = res.id;
                    if (res.downloadUrl) {
                      downloadFile(res.downloadUrl, `${makeFilename()}.docx`);
                      return;
                    }
                  }
                  downloadReport(reportId);
                }}
              >
                <Download className="mr-1 text-2xl" /> Dok
              </Button>
            )}
            <Button
              variant="default"
              className="w-24 bg-emerald-600"
              disabled={simulationMutations.loading || !title || !validation.ok}
              onClick={async () => {
                if (!drawing) {
                  return;
                }

                // Inform parent to hide result UI instantly
                onRunStart?.();

                onSave({ title, history: state.history, projectId, hasChanges: false, consequenceClass, robustnessFactor });

                const created = await simulationMutations.createSimulation({
                  projectId,
                  drawingId: drawing?.id,
                  entities: flipYAxisOnResolvedEntities(entitySet),
                });
                // Inform parent about created simulation id immediately (for SSE/poll)
                if (created?.id) {
                  onSimulationCreated?.(created.id);
                }
                // Locally mark drawing as not changed after run
                // (the onSave above already persisted hasChanges: false)
                // Parent controls props; local state will reflect via DrawingBoard onSave wrapper
                // Notify parent/page to refetch latest simulation so UI updates immediately
                onSimulationQueued?.();
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
              consequenceClass,
              robustnessFactor,
            })
          }
        >
          <Archive className="mr-1" /> Gem
        </Button>
        {onDelete && (
          <WithConfirmation onConfirm={() => onDelete()}>
            <Button
              variant="outline"
              className="w-24 border-red-500 text-red-500"
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
