/**
 * ProjectGrid Component
 * 
 * A masonry grid layout for displaying project collections using react-photo-album.
 * Projects are numbered sequentially (1, 2, 3...) and positioned optimally to minimize gaps.
 * 
 * Features:
 * - True masonry layout (shortest column gets next item)
 * - Sequential numbering based on data order (not visual position)
 * - Responsive: 1 column mobile, 2 columns desktop
 * - Automatic image dimension loading for optimal layout
 * - Scroll-triggered animations
 * - Loading and error states
 * 
 * Technical Notes:
 * - Uses react-photo-album's masonry layout engine
 * - Disables CSS columns-specific styles in ProjectBlock (break-inside-avoid)
 * - Loads actual image dimensions for accurate masonry calculations
 */

import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import ProjectBlock from './ProjectBlock';
import PhotoAlbum, { type RenderPhotoProps, type RenderPhotoContext } from 'react-photo-album';
import 'react-photo-album/masonry.css';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useState, useEffect } from 'react';

interface Project {
  id: number;
  Title: string;
  cover?: {
    url: string;
    width?: number;
    height?: number;
  };
  [key: string]: unknown;
}

interface ProjectGridProps {
  className?: string;
  limit?: number;
  featured?: boolean;
  featuredProjects?: Project[];
  numberColor?: string;
}

/**
 * Extended photo type that includes project data and sequential number
 */
interface PhotoWithProject {
  src: string;
  width: number;
  height: number;
  project: Project;
  number: number;
}

/**
 * Wrapper component for scroll-triggered fade-in animations
 */
const AnimatedProject = ({ children }: { children: React.ReactNode }) => {
  const { elementRef, animationStyle } = useScrollAnimation({
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
    delay: 0,
    duration: 400
  });

  return (
    <div ref={elementRef as React.RefObject<HTMLDivElement>} style={animationStyle}>
      {children}
    </div>
  );
};

const ProjectGrid = ({ className = '', limit, featured, featuredProjects, numberColor }: ProjectGridProps) => {
  const [photos, setPhotos] = useState<PhotoWithProject[]>([]);

  // Fetch projects from API
  const { data: projectsResponse, isLoading, error } = useQuery({
    queryKey: ['projects', { limit, featured }],
    queryFn: () => apiService.getCollection('projects', '*'),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 5 * 60 * 1000,
    enabled: !featuredProjects,
  });

  const projects = projectsResponse?.data as Project[];
  const displayProjects = featuredProjects && featuredProjects.length > 0 ? featuredProjects : projects;

  /**
   * Load actual image dimensions for accurate masonry layout calculations.
   * Projects are numbered sequentially (1, 2, 3...) regardless of their visual position.
   */
  useEffect(() => {
    if (!displayProjects || displayProjects.length === 0) return;

    const loadImageDimensions = async () => {
      const photosWithDimensions = await Promise.all(
        displayProjects
          .filter(project => project.cover?.url)
          .map((project, index) => 
            new Promise<PhotoWithProject>((resolve) => {
              const img = new Image();
              
              img.onload = () => {
                resolve({
                  src: project.cover!.url,
                  width: img.naturalWidth || 800,
                  height: img.naturalHeight || 600,
                  project,
                  number: index + 1 // Sequential numbering
                });
              };
              
              img.onerror = () => {
                // Fallback to 4:3 aspect ratio if image fails to load
                resolve({
                  src: project.cover!.url,
                  width: 800,
                  height: 600,
                  project,
                  number: index + 1
                });
              };
              
              img.src = project.cover!.url;
            })
          )
      );

      setPhotos(photosWithDimensions);
    };

    loadImageDimensions();
  }, [displayProjects]);

  /**
   * Custom render function for each photo in the masonry grid.
   * Wraps ProjectBlock with animation and proper spacing.
   */
  const renderPhoto = (_: RenderPhotoProps, context: RenderPhotoContext<PhotoWithProject>) => {
    const { photo } = context;
    
    return (
      <div style={{ marginBottom: '2rem' }}>
        <AnimatedProject>
          <ProjectBlock 
            project={photo.project}
            number={photo.number}
            numberColor={numberColor}
            disableColumnStyles={true}
          />
        </AnimatedProject>
      </div>
    );
  };

  if (isLoading || photos.length === 0) {
    return (
      <section className={`py-16 px-10 ${className}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="columns-1 md:columns-2 gap-16">
            {Array.from({ length: 6 }).map((_, index) => {
              const imageHeights = ['h-100', 'h-172', 'h-100', 'h-80', 'h-100', 'h-150'];
              const imageHeight = imageHeights[index % imageHeights.length];
              
              return (
                <div key={`loading-${index}`} className="group break-inside-avoid mb-24">
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <div className="w-full bg-white">
                      <div className={`${imageHeight} bg-gray-50`}></div>
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className="h-6 bg-gray-100 rounded mb-2"></div>
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-1"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

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

  if (!displayProjects || !Array.isArray(displayProjects) || displayProjects.length === 0) {
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
    <section className={`py-24 px-10 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <PhotoAlbum
          layout="masonry"
          photos={photos}
          render={{ photo: renderPhoto }}
          spacing={64}
          columns={(containerWidth) => {
            if (containerWidth < 768) return 1;
            return 2;
          }}
        />
      </div>
    </section>
  );
};

export default ProjectGrid;
