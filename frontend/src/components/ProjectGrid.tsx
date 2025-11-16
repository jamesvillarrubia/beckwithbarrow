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
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useEffect, useState, useRef } from 'react';

interface Project {
  id: number;
  Title: string;
  cover?: {
    url: string;
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

// Animated project wrapper component
const AnimatedProject = ({ children }: { children: React.ReactNode }) => {
  const { elementRef, animationStyle } = useScrollAnimation({
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
    delay: 0, // No artificial delay - trigger when in view
    duration: 400
  });

  return (
    <div ref={elementRef as React.RefObject<HTMLDivElement>} style={animationStyle}>
      {children}
    </div>
  );
};

const ProjectGrid = ({ className = '', limit, featured, featuredProjects, numberColor }: ProjectGridProps) => {
  const [visualOrder, setVisualOrder] = useState<number[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  // Fetch projects list using React Query (always call hooks)
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
    retry: 3, // Increase retries for cold starts
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff: 1s, 2s, 4s
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !featuredProjects, // Only fetch if no featured projects provided
  });

  const projects = projectsResponse?.data as Project[];
  const displayProjects = featuredProjects && featuredProjects.length > 0 ? featuredProjects : projects;

  // Calculate visual order after layout is complete
  useEffect(() => {
    if (!displayProjects || displayProjects.length === 0) return;

    const calculateVisualOrder = () => {
      if (!gridRef.current) return;

      const projectElements = gridRef.current.querySelectorAll('[data-project-id]');
      const positions: { id: number; top: number; left: number }[] = [];

      projectElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const projectId = parseInt(element.getAttribute('data-project-id') || '0');
        positions.push({
          id: projectId,
          top: rect.top,
          left: rect.left
        });
      });

      // Sort by top position first, then by left position
      positions.sort((a, b) => {
        if (Math.abs(a.top - b.top) < 10) { // Same row (within 10px)
          return a.left - b.left; // Sort by left position
        }
        return a.top - b.top; // Sort by top position
      });

      // Create mapping from project ID to visual order
      const visualOrderMap = new Map<number, number>();
      positions.forEach((pos, index) => {
        visualOrderMap.set(pos.id, index + 1);
      });

      // Convert to array in original project order
      const filteredProjects = displayProjects.filter(project => project.cover?.url);
      const order = filteredProjects.map(project => visualOrderMap.get(project.id) || 0);
      setVisualOrder(order);
    };

    // Calculate after a short delay to ensure layout is complete
    const timeoutId = setTimeout(calculateVisualOrder, 100);
    
    // Also recalculate on window resize
    window.addEventListener('resize', calculateVisualOrder);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateVisualOrder);
    };
  }, [displayProjects]);

  // Always show loading state for now (placeholder boxes)
  if (isLoading) {
    return (
      <section className={`py-16 px-10 ${className}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="columns-2 gap-16">
            {Array.from({ length: 6 }).map((_, index) => {
              // Random heights for more natural masonry layout - all h-64 or larger
              const imageHeights = ['h-100', 'h-172', 'h-100',  'h-80',   'h-100', 'h-150'];
              const imageHeight = imageHeights[index % imageHeights.length];
              
              return (
                <div key={`loading-${index}`} className="group break-inside-avoid mb-24">
                   <div className="overflow-hidden rounded-lg border border-gray-100">
                     <div className="w-full bg-white">
                       <div className={`${imageHeight} bg-gray-50`}
                        //    style={{ backgroundColor: '#fdfdfd' }}
                        ></div>
                     </div>
                   </div>
                  <div className="pt-4">
                    <div className={`h-6 bg-gray-100 rounded mb-2`}></div>
                    <div className={`h-4 bg-gray-100 rounded w-3/4 mb-1`}></div>
                    <div className={`h-4 bg-gray-100 rounded w-1/2`}></div>
                  </div>
                </div>
              );
            })}
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
    <section className={`py-16 px-10 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        {/* Masonry Grid */}
        <div ref={gridRef} className="columns-2 gap-16">
          {displayProjects
            .filter(project => project.cover?.url) // Only show projects with cover images
            .map((project, index) => (
              <AnimatedProject key={project.id}>
                <div data-project-id={project.id}>
                  <ProjectBlock 
                    project={project}
                    number={visualOrder[index] || index + 1}
                    numberColor={numberColor}
                  />
                </div>
              </AnimatedProject>
            ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectGrid;
