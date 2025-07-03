'use client';

import { useDrawing, type Drawing } from '@/lib/api/use-drawings';
import { useProject } from '@/lib/api/use-projects';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Download, Edit, Trash2, Undo, Redo } from 'lucide-react';
import { useState } from 'react';

export default function DrawingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id ? parseInt(params.id as string, 10) : null;
  const drawingId = params.drawingId ? parseInt(params.drawingId as string, 10) : null;
  
  const { project, loading: projectLoading } = useProject(projectId);
  const { drawing, loading: drawingLoading, error } = useDrawing(drawingId);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  if (projectLoading || drawingLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Loading drawing...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!drawing || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Drawing or project not found</div>
      </div>
    );
  }

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving drawing...');
    setHasUnsavedChanges(false);
  };

  const handleDelete = () => {
    if (window.confirm('Er du sikker på, at du vil slette denne tegning?')) {
      // TODO: Implement delete functionality
      router.push(`/projects/${projectId}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Project
              </Button>
            </Link>
            <div className="border-l border-gray-300 h-6"></div>
            <div>
              <h1 className="text-lg font-semibold">{drawing.title}</h1>
              <p className="text-sm text-gray-500">{project.title}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <span className="text-sm text-orange-600">Unsaved changes</span>
            )}
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Drawing Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Drawing Tools */}
            <div className="flex items-center space-x-1 bg-white rounded border p-1">
              <Button variant="ghost" size="sm">
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Redo className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="border-l border-gray-300 h-6"></div>
            
            {/* Tool Palette Placeholder */}
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm">
                Select
              </Button>
              <Button variant="outline" size="sm">
                Line
              </Button>
              <Button variant="outline" size="sm">
                Rectangle
              </Button>
              <Button variant="outline" size="sm">
                Circle
              </Button>
              <Button variant="outline" size="sm">
                Text
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Properties
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Main Drawing Canvas Area */}
      <div className="flex-1 bg-gray-100 overflow-hidden">
        <div className="h-full flex items-center justify-center">
          {/* Drawing Canvas Placeholder */}
          <div className="bg-white shadow-lg rounded-lg p-8 max-w-4xl w-full h-[600px] flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center">
              <div className="text-gray-500 text-lg mb-2">Drawing Canvas</div>
              <p className="text-gray-400 text-sm">
                Drawing ID: {drawing.id}
              </p>
              <p className="text-gray-400 text-sm">
                Last updated: {new Date(drawing.updatedAt).toLocaleString('da-DK')}
              </p>
              {drawing.hasChanges && (
                <p className="text-orange-600 text-sm mt-2">
                  This drawing has unsaved changes
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Zoom: 100%</span>
            <span>Grid: On</span>
            <span>Snap: On</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Created: {new Date(drawing.createdAt).toLocaleDateString('da-DK')}</span>
            <span>Template: {drawing.isTemplate ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
