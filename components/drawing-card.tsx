'use client';

import React from 'react';
import Link from 'next/link';
import { useDrawingMutations, type Drawing } from '@/lib/api/use-drawings';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

type DrawingCardProps = {
  drawing: Drawing;
  refetchDrawings: () => void;
};

const DrawingCard: React.FC<DrawingCardProps> = ({
  drawing,
  refetchDrawings,
}) => {
  const { deleteDrawing } = useDrawingMutations();

  const handleDelete = async () => {
    if (window.confirm('Er du sikker på, at du vil slette denne tegning?')) {
      try {
        await deleteDrawing(drawing.id);
        refetchDrawings();
      } catch (error) {
        console.error('Failed to delete drawing:', error);
      }
    }
  };

  return (
    <div>
      <div
        key={drawing.id}
        className="w-52 h-52 shadow rounded border bg-white hover:bg-gray-50 cursor-pointer"
      >
        <div className="flex justify-between items-center">
          <Link
            className="flex-1 p-2 pb-0"
            href={`/projects/${drawing.projectId}/draw/${drawing.id}`}
          >
            <div>{drawing.title}</div>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 mx-1">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                Slet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Link
          className="block p-2"
          href={`/projects/${drawing.projectId}/draw/${drawing.id}`}
        >
          <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center">
            {/* <DrawingThumbnail drawing={drawing} /> */}
          </div>
        </Link>
      </div>
    </div>
  );
};

export default DrawingCard;