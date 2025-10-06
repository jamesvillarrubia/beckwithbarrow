/**
 * HomePage Component
 * 
 * The main landing page featuring:
 * - Full-height hero section with dual images and centered "Willow Voice" branding
 * - Inspirational slogan section
 * - Masonry layout showcasing projects with staggered positioning
 */

import { useQuery } from '@tanstack/react-query';
import Footer from '../components/Footer';
import Logo from '../components/Logo';
import Navigation from '../components/Navigation';
import ProjectGrid from '../components/ProjectGrid';
import AnimatedSection from '../components/AnimatedSection';
import { apiService } from '../services/api';

interface Project {
  id: number;
  cover?: {
    url: string;
    formats?: {
      large?: { url: string; };
    };
    alternativeText?: string;
  };
  [key: string]: unknown;
}

interface HomeContent {
  title?: string;
  leftImage?: {
    url: string;
    formats?: {
      large?: { url: string; };
    };
    alternativeText?: string;
  };
  rightImage?: {
    url: string;
    formats?: {
      large?: { url: string; };
    };
    alternativeText?: string;
  };
  projects?: Project[];
  quote?: {
    quoteText?: string;
    name?: string;
  }[];
}

const HomePage = () => {
  // Fetch home page content
  const { data: homeData, isLoading, error } = useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      console.log('Fetching home page data from API...');
      try {
        const result = await apiService.getSingleType('home', 'leftImage,rightImage,projects.cover,quote');
        console.log('Home API Response:', result);
        return result;
      } catch (err) {
        console.error('Home API Error:', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const homeContent = homeData?.data as HomeContent;

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-white text-black">
        <Navigation />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-white text-black">
        <Navigation />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg">Unable to load home page content</p>
            <p className="text-gray-500 text-sm mt-2">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-black">
      {/* Navigation */}
      <Navigation />
      
      {/* Hero Section - 100vh with dual images and centered text */}
      <section className="relative h-screen flex">
        {/* Left Image */}
        <div className="w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/40 z-10"></div>
          <img
            src={homeContent?.leftImage?.formats?.large?.url || homeContent?.leftImage?.url || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80"}
            alt={homeContent?.leftImage?.alternativeText || "Architectural interior"}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right Image */}
        <div className="w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/40 z-10"></div>
          <img
            src={homeContent?.rightImage?.formats?.large?.url || homeContent?.rightImage?.url || "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"}
            alt={homeContent?.rightImage?.alternativeText || "Modern home exterior"}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Centered Text Overlay */}
        <div className="absolute w-full h-full z-20 flex items-center justify-center">
          <AnimatedSection delay={500} duration={800}>
            <Logo size="hero" color="white" />
          </AnimatedSection>
        </div>
      </section>

      {/* Slogan Section */}
      <AnimatedSection 
        as="section" 
        className="py-24" 
        style={{ paddingTop: '100px', paddingBottom: '100px', backgroundColor: '#ffe9d7' }}
        delay={200}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16 text-left">
          <h3 className="text-4xl md:text-6xl font-serif font-extralight leading-tight text-gray-900">
            {homeContent?.quote?.[0]?.quoteText || "Architecture is a visual art, and the buildings speak for themselves."}
          </h3>
          <p className="text-xl md:text-2xl font-sans text-gray-500 mt-8 text-right">
            — {homeContent?.quote?.[0]?.name || "Julia Morgan"}
          </p>
        </div>
      </AnimatedSection>

      {/* Projects Grid */}
      <ProjectGrid featuredProjects={homeContent?.projects} />


      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;