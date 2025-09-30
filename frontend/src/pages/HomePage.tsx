/**
 * HomePage Component
 * 
 * The main landing page featuring:
 * - Full-height hero section with dual images and centered "Willow Voice" branding
 * - Inspirational slogan section
 * - Masonry layout showcasing projects with staggered positioning
 */

import Footer from '../components/Footer';
import Logo from '../components/Logo';
import Navigation from '../components/Navigation';
import ProjectGrid from '../components/ProjectGrid';


const HomePage = () => {

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
            src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80"
            alt="Architectural interior"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right Image */}
        <div className="w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/40 z-10"></div>
          <img
            src="https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
            alt="Modern home exterior"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Centered Text Overlay */}
        <div className="absolute w-full h-full z-20 flex items-center justify-center">
          <Logo size="hero" color="white" />
        </div>
      </section>

      {/* Slogan Section */}
      <section className="py-24" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16 text-left">
          <h3 className="text-4xl md:text-6xl font-serif font-extralight leading-tight text-gray-900">
            "Architecture is a visual art, and the buildings speak for themselves."
          </h3>
          <p className="text-xl md:text-2xl font-sans text-gray-500 mt-8 text-right">
            — Julia Morgan
          </p>
        </div>
      </section>

      {/* Projects Grid */}
      <ProjectGrid />


      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;