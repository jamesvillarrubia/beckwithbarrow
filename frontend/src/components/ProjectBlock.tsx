/**
 * ProjectBlock Component
 * 
 * A reusable project display component that fetches and displays individual project data.
 * Uses React Query for efficient data fetching and caching.
 * 
 * Features:
 * - Fetches project data using React Query
 * - Displays project image, title, and description
 * - Hover effects and responsive design
 * - Loading and error states
 * - Reusable across different pages
 */

import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

interface ProjectBlockProps {
  projectId: number;
  className?: string;
}

const ProjectBlock = ({ projectId, className = '' }: ProjectBlockProps) => {
  // Fetch project data using React Query
  const { data: projectResponse, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiService.getItem('projects', projectId),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const project = projectResponse?.data as any;

  // Loading state
  if (isLoading) {
    return (
      <div className={`group break-inside-avoid mb-24 ${className}`}>
        <div className="overflow-hidden rounded-sm">
          <div className="w-full h-64 bg-gray-200 animate-pulse"></div>
        </div>
        <div className="pt-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`group break-inside-avoid mb-24 ${className}`}>
        <div className="overflow-hidden rounded-sm bg-red-50 border border-red-200 p-4">
          <p className="text-red-600 text-sm">Failed to load project</p>
        </div>
      </div>
    );
  }

  // No project data
  if (!project) {
    return (
      <div className={`group break-inside-avoid mb-24 ${className}`}>
        <div className="overflow-hidden rounded-sm bg-gray-50 border border-gray-200 p-4">
          <p className="text-gray-600 text-sm">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`group break-inside-avoid mb-24 ${className}`}>
      <div className="overflow-hidden rounded-sm cursor-pointer">
        <img 
          className="w-full h-auto transition-transform duration-700 ease-in-out group-hover:scale-102"
          src={project.imageUrl}
          alt={project.alt}
          loading="lazy"
        />
      </div>
      <div className="pt-4">
        <h5 className="text-xl font-normal text-gray-900 cursor-pointer hover:text-gray-700 transition-colors">
          {project.title}
        </h5>
        {project.category && (
          <p className="text-sm text-gray-500 mt-1 font-medium">
            {project.category}
          </p>
        )}
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          {project.description}
        </p>
      </div>
    </div>
  );
};

export default ProjectBlock;
