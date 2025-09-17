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

// Simple project interface for mock data
interface SimpleProject {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  alt: string;
}

// Mock project data - will be replaced with API call later
const mockProjects = [
  {
    id: 1,
    title: "Riverside Residence",
    category: "Contemporary Interior",
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600&q=80",
    alt: "Modern Living Room",
    description: "A stunning contemporary living space featuring floor-to-ceiling windows, minimalist furnishings, and warm natural lighting that creates an inviting atmosphere for both relaxation and entertaining."
  },
 
  {
    id: 3,
    title: "Spa Bathroom",
    category: "Luxury Design",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&fm=jpg&fit=crop&w=1080&q=80&fit=max",
    alt: "Bathroom Design",
    description: "An elegant spa-inspired bathroom retreat with marble finishes, sophisticated lighting design, and luxurious fixtures that transform daily routines into moments of personal sanctuary."
  },
  {
    id: 5,
    title: "Serene Bedroom",
    category: "Residential Interior",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=800&q=80",
    alt: "Bedroom Interior",
    description: "A tranquil master bedroom designed with soft neutral tones, plush textiles, and carefully curated lighting to create the perfect environment for rest and rejuvenation."
  },
  {
    id: 2,
    title: "Urban Kitchen",
    category: "Interior Renovation", 
    imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600&q=80",
    alt: "Kitchen Design",
    description: "A modern culinary workspace combining sleek cabinetry, premium appliances, and intelligent storage solutions to create both functional efficiency and aesthetic appeal for the contemporary home."
  },
  {
    id: 4,
    title: "Hillside Manor",
    category: "Architectural Design",
    imageUrl: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=800&q=80",
    alt: "Modern Exterior",
    description: "An architectural masterpiece that seamlessly blends contemporary design with natural surroundings, featuring clean lines, expansive glass surfaces, and thoughtful integration with the landscape."
  },
  {
    id: 6,
    title: "Executive Office",
    category: "Commercial Design",
    imageUrl: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=800&q=80",
    alt: "Office Space",
    description: "A sophisticated professional environment designed to inspire productivity and creativity, featuring premium materials, ergonomic considerations, and refined aesthetics that reflect executive excellence."
  }
];

const HomePage = () => {
  // TODO: Replace with actual API call
  // const { data: projects, isLoading, error } = useQuery({
  //   queryKey: ['projects'],
  //   queryFn: () => apiService.getCollection('projects', '*'),
  //   retry: false,
  // });
  
  // For now, use mock data
  const projects: SimpleProject[] = mockProjects;

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

      {/* Projects Masonry Grid */}
      <section className="py-16 px-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          {/* Masonry Grid */}
          <div className="columns-2 gap-16">
            {projects.map((project) => (
              <div key={project.id} className="group break-inside-avoid mb-24">
                <div className="overflow-hidden rounded-sm cursor-pointer">
                  <img 
                    className="w-full h-auto transition-transform duration-700 ease-in-out group-hover:scale-102"
                    src={project.imageUrl}
                    alt={project.alt}
                  />
                </div>
                <div className="pt-4">
                  <h5 className="text-xl font-normal text-gray-900 cursor-pointer hover:text-gray-700 transition-colors">{project.title}</h5>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{project.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;