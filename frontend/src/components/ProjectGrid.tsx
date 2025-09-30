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
    queryFn: async () => {
      console.log('Fetching projects from API...');
      try {
        const result = await apiService.getCollection('projects', '*');
        console.log('API Response:', result);
        return result;
      } catch (err) {
        console.error('API Error:', err);
        throw err;
      }
    },
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
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={`loading-${index}`} className="group break-inside-avoid mb-24">
                <div className="overflow-hidden rounded-sm">
                  <div className="w-full bg-white border border-gray-100 rounded-sm shadow-sm">
                    <div className="h-64 bg-gray-50 animate-pulse"></div>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
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
            <p className="text-gray-600 text-lg">Unable to load projects</p>
            <p className="text-gray-500 text-sm mt-2">Please try again later</p>
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
          {projects
            .filter(project => project.cover?.url) // Only show projects with cover images
            .map((project) => (
              <ProjectBlock 
                key={project.id} 
                project={project}
              />
            ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectGrid;
