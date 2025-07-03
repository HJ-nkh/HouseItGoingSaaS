'use client';

import { useProjectsWithMutations, type Project } from '@/lib/api/use-projects';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus } from 'lucide-react';

type MenuItemProps = {
  project: Project;
  onDelete: (id: number) => void;
};

const MenuItem: React.FC<MenuItemProps> = ({ project, onDelete }) => {
  const handleDelete = () => {
    if (window.confirm('Er du sikker på, at du vil slette dette projekt?')) {
      onDelete(project.id);
    }
  };

  return (
    <div
      key={project.id}
      className="mb-2 pl-4 pr-2 py-1 shadow rounded border bg-white hover:bg-gray-50 cursor-pointer flex justify-between items-center"
    >
      <Link
        className="block flex-1"
        href={`/projects/${project.id}`}
      >
        {project.title}{project.address && project.address !== "" ? `, ${project.address}` : ""}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            Slet projekt
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default function ProjectsPage() {
  const { projects, loading, error, createProject, deleteProject } = useProjectsWithMutations();

  const [projectName, setProjectName] = useState("");
  const [address, setAddress] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleCreateProject = async () => {
    try {
      await createProject({ title: projectName, address: address });
      setProjectName("");
      setAddress("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await deleteProject(id);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Henter projekter...</div>
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

  return (
    <div className="flex h-full">
      <div className="flex-1 p-4 overflow-auto">
        <div className="mb-4 text-lg font-semibold">Projekter</div>
        <div className="max-w-md">
          {projects?.map((project: Project) => (
            <MenuItem
              key={project.id}
              project={project}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Nyt projekt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nyt projekt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Projektnummer / navn"
              />
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Projektadresse (valgfrit)"
              />
              <div className="flex justify-end gap-2">
                <Button
                  disabled={projectName.length === 0}
                  onClick={handleCreateProject}
                >
                  Opret
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
