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
import { useGlobalSettings } from '../hooks/useGlobalSettings';

interface ProjectBlockProps {
  project: {
    id: number;
    Title: string;
    description?: string;
    slug?: string;
    cover?: {
      url: string;
      alternativeText?: string;
    };
    [key: string]: unknown;
  };
  className?: string;
  number?: number;
  numberColor?: string;
}

const ProjectBlock = ({ project, className = '', number, numberColor }: ProjectBlockProps) => {
  const navigate = useNavigate();
  const { lightThemeColor } = useGlobalSettings();
  
  // Use numberColor prop first, then global settings, then fallback
  const finalNumberColor = numberColor || lightThemeColor;

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
        {/* Number and title on same row */}
        <div className="flex items-end gap-4 -mt-16 mb-1">
          {/* Large graphic number */}
          {number && (
            <div className="flex-shrink-0 relative z-10 pl-3">
                <span className="text-8xl swifted" style={{ lineHeight: '0.9', display: 'block', marginBottom: '-0.1em', color: finalNumberColor }}>
                  {number.toString().padStart(2, '0')}
                </span>
            </div>
          )}
          
          {/* Project title */}
          <h5 
            className="text-2xl font-normal text-gray-900 cursor-pointer hover:text-gray-700 transition-colors flex-1 mt-16"
            onClick={handleProjectClick}
          >
            {project.Title}
          </h5>
        </div>
        
        {/* Description below both - full width */}
        <div>
          <p className="text-sm text-gray-600 leading-relaxed">
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
