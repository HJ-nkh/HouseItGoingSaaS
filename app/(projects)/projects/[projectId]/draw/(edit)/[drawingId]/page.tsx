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

  const { drawing, loading, refetch } = useDrawing(drawingId);
  const { simulations } = useSimulations({}, { drawingId, limit: 1});

	const simulation = simulations?.[0];

	// TODO: When done deleting a drawing, navugate to /projects/[projectId]
	const { updateDrawing, deleteDrawing } = useDrawingMutations();

  // If a recent simulation is pending, poll it every 5 seconds
  useEffect(() => {
    if (simulation?.status === SimulationStatus.Pending) {
      console.info("Found pending simulation");
      const intervalId = setInterval(refetch, 5000);

      return () => clearInterval(intervalId);
    }
  }, [simulation?.status, refetch]);

  if (loading) {
    return null;
  }

  return (
    <DrawingBoard
      key={`drawing-board-${drawingId}`}
      drawing={drawing}
      simulation={simulation}
      onSave={(drawing) => updateDrawing(drawingId, drawing)}
      onDelete={async () => {
        await deleteDrawing(drawingId);
        router.push(`/projects/${projectId}`) }}
    />
  );
};

export default DrawingPage;
