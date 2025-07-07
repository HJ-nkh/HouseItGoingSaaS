'use client';

import { useProject, useProjectMutations } from '@/lib/api/use-projects';
import { useDrawings } from '@/lib/api/use-drawings';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, Plus } from 'lucide-react';
import DrawingCard from '@/components/drawing-card';
import WithConfirmation from '@/components/with-confirmation';

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId ? parseInt(params.projectId as string, 10) : null;
  
  const { project, loading, error } = useProject(projectId);
  const { drawings, loading: drawingsLoading, refetch: refetchDrawings } = useDrawings({}, { projectId: projectId || undefined });

  const projectMutations = useProjectMutations();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Henter projekt...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-red-600">Fejl: {error}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Projekt ikke fundet</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <Button variant="ghost" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Tilbage til projekter
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Redigér
              </Button>
              <WithConfirmation onConfirm={() => projectMutations.deleteProject(project.id)}>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Slet
                </Button>
              </WithConfirmation>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
          {project.address && (
            <p className="text-lg text-gray-600 mt-2">{project.address}</p>
          )}
        </div>

        {/* Project Details */}
        <div className="grid gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Projekt</h2>
              <div className="flex space-x-8">
                <div>
                  <label className="text-sm font-medium text-gray-500">Oprettet</label>
                  <p className="text-sm text-gray-900">
                    {new Date(project.createdAt).toLocaleDateString('da-DK', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sidst opdateret</label>
                  <p className="text-sm text-gray-900">
                    {new Date(project.updatedAt).toLocaleDateString('da-DK', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Drawings Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Modeller</h2>
                <Link href={`/projects/${projectId}/draw/new`}>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Opret model
                  </Button>
                </Link>
              </div>
              {drawingsLoading ? (
                <p className="text-gray-500">Henter modeller...</p>
              ) : drawings && drawings.length > 0 ? (
                <div className="flex gap-4">
                  {drawings.map((drawing) => (
                    <DrawingCard
                      key={drawing.id}
                      drawing={drawing}
                      refetchDrawings={refetchDrawings}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Ingen modeller</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Rapporter</h2>
              <p className="text-gray-500">Ingen rapporter</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
