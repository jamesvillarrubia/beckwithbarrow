/**
 * ProjectPage Component
 * 
 * A dedicated page for displaying individual project details including:
 * - Project information and metadata
 * - Image grid with masonry layout
 * - Lightbox functionality for image viewing
 * - Navigation back to home
 * 
 * Features:
 * - Fetches project data by slug or ID
 * - Responsive image grid layout
 * - Full-screen lightbox for image viewing
 * - SEO-friendly URL structure
 */

import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import Navigation from '../components/Navigation';
import ImageGrid from '../components/ImageGrid';
import AnimatedSection from '../components/AnimatedSection';
import { apiService } from '../services/api';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

interface ProjectImage {
  id: number;
  url: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: {
    small?: { url: string; width: number; height: number; };
    medium?: { url: string; width: number; height: number; };
    large?: { url: string; width: number; height: number; };
    thumbnail?: { url: string; width: number; height: number; };
  };
}

interface Project {
  id: number;
  Title: string;
  description?: string;
  slug?: string;
  cover?: {
    url: string;
    alternativeText?: string;
    width?: number;
    height?: number;
    formats?: {
      small?: { url: string; width: number; height: number; };
      medium?: { url: string; width: number; height: number; };
      large?: { url: string; width: number; height: number; };
      thumbnail?: { url: string; width: number; height: number; };
    };
  };
  images?: ProjectImage[];
  categories?: Array<{
    name: string;
  }>;
  location?: string;
  year?: number;
  client?: string;
  [key: string]: unknown;
}

const ProjectPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showDebug, setShowDebug] = useState(false);
  const { lightThemeColor } = useGlobalSettings();
  
  // Fetch home content to get numberColors
  const { data: homeData } = useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      try {
        const result = await apiService.getSingleType('home');
        return result;
      } catch (err) {
        console.error('Home API Error:', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const homeContent = homeData?.data as { numberColors?: string };
  
  // Get the project number from URL parameters
  const projectNumber = searchParams.get('number');

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]); // Re-run when slug changes

  // Fetch project data by slug
  const { data: projectData, isLoading, error } = useQuery({
    queryKey: ['project', slug],
    queryFn: async () => {
      console.log(`Fetching project data for slug: ${slug}`);
      try {
        // First try to find by slug
        const result = await apiService.getCollection('projects', 'images,cover,categories');
        const projects = result.data as Project[];
        const project = projects.find(p => p.slug === slug);
        
        if (!project) {
          throw new Error('Project not found');
        }
        
        console.log('Project API Response:', project);
        return { data: project };
      } catch (err) {
        console.error('Project API Error:', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!slug,
  });

  const project = projectData?.data as Project;

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-white text-black">
        <Navigation />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading project...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show error state
  if (error || !project) {
    return (
      <div className="bg-white text-black">
        <Navigation />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg">Project not found</p>
            <p className="text-gray-500 text-sm mt-2">The project you're looking for doesn't exist</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Prepare images array (cover + project images, avoiding duplicates)
  const allImages: ProjectImage[] = [];
  const addedUrls = new Set<string>();
  
  // Add cover image if it exists
  if (project.cover?.url) {
    allImages.push({
      id: 0,
      url: project.cover.url,
      alternativeText: project.cover.alternativeText || project.Title,
      width: project.cover.width,
      height: project.cover.height,
      formats: project.cover.formats,
    });
    addedUrls.add(project.cover.url);
  }
  
  // Add project images (avoiding duplicates with cover image)
  if (project.images && Array.isArray(project.images)) {
    project.images.forEach(image => {
      if (!addedUrls.has(image.url)) {
        allImages.push(image);
        addedUrls.add(image.url);
      }
    });
  }

  return (
    <div className="bg-white text-black">
      {/* Navigation */}
      <Navigation />
      
      {/* Project Header */}
      <AnimatedSection as="section" className="py-16 px-6 md:px-12 lg:px-16" delay={100}>
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="mb-8 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 mt-8 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>

          {/* Project Title */}
          <div className="flex items-start gap-6 mb-6">
            {/* Project Number */}
            {projectNumber && (
              <div className="flex-shrink-0">
                <span className="text-8xl swifted leading-tight" style={{ color: homeContent?.numberColors || lightThemeColor }}>
                  {projectNumber.padStart(2, '0')}
                </span>
              </div>
            )}
            
            {/* Project Title */}
            <h1 className="text-4xl md:text-6xl font-serif font-light leading-tight text-gray-900">
              {project.Title}
            </h1>
          </div>

          {/* Project Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {project.location && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Location</h3>
                <p className="text-gray-900">{project.location}</p>
              </div>
            )}
            {project.year && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Year</h3>
                <p className="text-gray-900">{project.year}</p>
              </div>
            )}
            {project.client && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Client</h3>
                <p className="text-gray-900">{project.client}</p>
              </div>
            )}
          </div>

          {/* Project Description */}
          {project.description && (
            <div className="mb-12">
              <p className="text-lg text-gray-700 leading-relaxed max-w-3xl">
                {project.description}
              </p>
            </div>
          )}

          {/* Categories */}
          {project.categories && project.categories.length > 0 && (
            <div className="mb-12">
              <div className="flex flex-wrap gap-2">
                {project.categories.map((category, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </AnimatedSection>

      {/* Debug Section */}
      <AnimatedSection as="section" className="py-8 px-6 md:px-12 lg:px-16 bg-gray-50" delay={200}>
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
          >
            {showDebug ? 'Hide' : 'Show'} Debug Info
          </button>
          
          {showDebug && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Raw Project Data</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
                <pre className="text-xs">
                  {JSON.stringify(project, null, 2)}
                </pre>
              </div>
              
              <h3 className="text-lg font-semibold mb-4 text-gray-900 mt-6">Processed Images Array</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
                <pre className="text-xs">
                  {JSON.stringify(allImages, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </AnimatedSection>

      {/* Image Grid */}
      {allImages.length > 0 && (
        <ImageGrid images={allImages} projectTitle={project.Title} />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ProjectPage;
