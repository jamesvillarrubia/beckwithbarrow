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
import { formatNumberWithO } from '../utils/formatNumber';

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

  // Format the number and check if it starts with O (originally started with 0)
  const formattedNumber = number ? formatNumberWithO(number) : '';
  const startsWithO = formattedNumber.startsWith('O');
  
  // If number starts with O, extend line to middle of O character
  // At text-8xl (6rem/96px), Lato Thin O is ~60px wide, so middle is ~30px
  const lineExtension = startsWithO ? '65px' : '0px';

  return (
    <div className={`group break-inside-avoid mb-24 ${className}`}>
      {/* Title and Number Row - Above Image */}
      <div className="flex items-center gap-4 mb-4">
        {/* Project title - left justified */}
        <h5 
          className="text-2xl font-normal text-gray-900 cursor-pointer hover:text-gray-700 transition-colors flex-shrink-0"
          onClick={handleProjectClick}
        >
          {project.Title}
        </h5>
        
        {/* Horizontal line connecting title to number */}
        <div 
          className="flex-grow h-px" 
          style={{ 
            backgroundColor: finalNumberColor,
            marginRight: `-${lineExtension}`
          }}
        ></div>
        
        {/* Large graphic number - right justified */}
        {number && (
          <div className="flex-shrink-0" style={{ transform: 'translateY(-2px)' }}>
            <span className="lato-thin" style={{ fontSize: '128px', lineHeight: '0.9', display: 'block', color: finalNumberColor }}>
              {formattedNumber}
            </span>
          </div>
        )}
      </div>

      {/* Project Image */}
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

      {/* Description below image */}
      <div className="pt-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          {project.description}
        </p>
      </div>
    </div>
  );
};

export default ProjectBlock;
