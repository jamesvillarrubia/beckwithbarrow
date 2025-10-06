/**
 * ProjectBlock Component
 * 
 * A reusable project display component that displays individual project data.
 * Receives project data as props for optimal performance.
 * 
 * Features:
 * - Displays project image, title, and description
 * - Hover effects and responsive design
 * - Handles missing images gracefully
 * - Clickable navigation to project detail pages
 * - Reusable across different pages
 */

import { useNavigate } from 'react-router-dom';

interface ProjectBlockProps {
  project: any;
  className?: string;
  number?: number;
}

const ProjectBlock = ({ project, className = '', number }: ProjectBlockProps) => {
  const navigate = useNavigate();

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

  const handleProjectClick = () => {
    // Navigate to project page using slug if available, otherwise use ID
    const projectSlug = project.slug || project.id;
    const url = number ? `/project/${projectSlug}?number=${number}` : `/project/${projectSlug}`;
    navigate(url);
  };

  return (
    <div className={`group break-inside-avoid mb-24 ${className}`}>
      <div 
        className="overflow-hidden rounded-sm cursor-pointer"
        onClick={handleProjectClick}
      >
        {project.cover?.url ? (
          <img 
            className="w-full h-auto transition-transform duration-700 ease-in-out group-hover:scale-102"
            src={project.cover.url}
            alt={project.cover.alternativeText || project.Title}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
            <p className="text-gray-500 text-sm">No image available</p>
          </div>
        )}
      </div>
      <div className="pt-4">
        {/* Large graphic number - positioned absolutely */}
        {number && (
          <div className="relative -mt-12 mb-4">
            <span className="text-8xl swifted text-gray-200 leading-tight">
              {number.toString().padStart(2, '0')}
            </span>
          </div>
        )}
        
        {/* Title and description - full width */}
        <div>
          <h5 
            className="text-xl font-normal text-gray-900 cursor-pointer hover:text-gray-700 transition-colors"
            onClick={handleProjectClick}
          >
            {project.Title}
          </h5>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            {project.description}
          </p>
          {/* {project.categories && project.categories.length > 0 && (
            <p className="text-sm text-gray-400 mt-2 italic">
              {project.categories[0].name}
            </p>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default ProjectBlock;
