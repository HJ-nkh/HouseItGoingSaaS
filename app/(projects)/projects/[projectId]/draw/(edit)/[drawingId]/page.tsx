'use client';

import { useDrawing, useDrawingMutations } from "@/lib/api/use-drawings";
import DrawingBoard from "@/components/drawing-board";
import { useEffect } from "react";
import { SimulationStatus } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useSimulations } from "@/lib/api";

const DrawingPage: React.FC = () => {
  const { drawingId, projectId }: { drawingId: string, projectId: string } = useParams();
  const router = useRouter();

  const { drawing, loading } = useDrawing(drawingId);
  // Only fetch the latest simulation
  const { simulations, refetch, invalidateCache } = useSimulations({}, { drawingId, limit: 1});

  const latest = simulations?.[0];

	// TODO: When done deleting a drawing, navugate to /projects/[projectId]
	const { updateDrawing, deleteDrawing } = useDrawingMutations();

  // If the latest simulation is pending or running, poll every second
  useEffect(() => {
    if (latest?.status === SimulationStatus.Pending || latest?.status === SimulationStatus.Running) {
      console.info("Simulation pending/running – starting poll loop");
      const intervalId = setInterval(() => { 
        invalidateCache(); 
        refetch(); 
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [latest, refetch, invalidateCache]);

  if (loading) {
    return null;
  }

  return (
    <DrawingBoard
      key={`drawing-board-${drawingId}`}
      drawing={drawing}
  simulation={latest}
  // When a simulation is queued, immediately refetch to show Pending overlay
  onSimulationQueued={refetch}
      onSave={(drawing) => updateDrawing(drawingId, drawing)}
      onDelete={async () => {
        await deleteDrawing(drawingId);
        router.push(`/projects/${projectId}`) }}
    />
  );
};

export default DrawingPage;
