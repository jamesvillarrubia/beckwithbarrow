/**
 * ProjectGrid Component
 * 
 * A grid layout component that displays multiple projects using ProjectBlock components.
 * Fetches the list of projects and renders them in a masonry-style grid.
 * 
 * Features:
 * - Fetches project list using React Query
 * - Renders projects in responsive masonry grid
 * - Handles loading and error states
 * - Configurable grid layout
 */

import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import ProjectBlock from './ProjectBlock';

interface ProjectGridProps {
  className?: string;
  limit?: number;
  featured?: boolean;
}

const ProjectGrid = ({ className = '', limit, featured }: ProjectGridProps) => {
  // Fetch projects list using React Query
  const { data: projectsResponse, isLoading, error } = useQuery({
    queryKey: ['projects', { limit, featured }],
    queryFn: () => apiService.getCollection('projects', '*'),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const projects = projectsResponse?.data as any[];

  // Loading state
  if (isLoading) {
    return (
      <section className={`py-16 px-10 ${className}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="columns-2 gap-16">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProjectBlock key={`loading-${index}`} projectId={0} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className={`py-16 px-10 ${className}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="text-center py-12">
            <p className="text-red-600 text-lg">Failed to load projects</p>
            <p className="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
          </div>
        </div>
      </section>
    );
  }

  // No projects
  if (!projects || !Array.isArray(projects) || projects.length === 0) {
    return (
      <section className={`py-16 px-10 ${className}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No projects found</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-16 px-10 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        {/* Masonry Grid */}
        <div className="columns-2 gap-16">
          {projects.map((project) => (
            <ProjectBlock 
              key={project.id} 
              projectId={project.id}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectGrid;
