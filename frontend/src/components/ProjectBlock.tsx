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
 * - Reusable across different pages
 */


interface ProjectBlockProps {
  project: any;
  className?: string;
}

const ProjectBlock = ({ project, className = '' }: ProjectBlockProps) => {
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
        <h5 className="text-xl font-normal text-gray-900 cursor-pointer hover:text-gray-700 transition-colors">
          {project.Title}
        </h5>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          {project.description}
        </p>
        {project.categories && project.categories.length > 0 && (
          <p className="text-sm text-gray-400 mt-2 italic">
            {project.categories[0].name}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProjectBlock;
