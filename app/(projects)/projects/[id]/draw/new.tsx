'use client';

import { CreateDrawingData, useDrawingMutations } from "@/lib/api/use-drawings";
import dynamic from "next/dynamic";

const DrawingBoard = dynamic(() => import("@/components/drawing-board"), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  )
});

const DrawingPage: React.FC = () => {
  const { createDrawing } = useDrawingMutations();

  return (
    <DrawingBoard
      key={`drawing-board-new`}
      onSave={(drawing) => createDrawing(drawing as unknown as CreateDrawingData)}
    />
  );
};

export default DrawingPage;
