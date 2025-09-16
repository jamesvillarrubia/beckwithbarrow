import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const HomePage = () => {
  // Fetch projects from Strapi with populated data
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getCollection('projects', '*'),
    retry: false,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load content. Make sure Strapi is running and you have created some content types." />;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-16">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Beckwith Barrow
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Showcasing exceptional projects with beautiful design and craftsmanship.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105">
            Get Started
          </button>
          <button className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300">
            Learn More
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
        {/* Feature Cards */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast</h3>
          <p className="text-gray-300">Built with Vite for incredibly fast development and production builds.</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Type Safe</h3>
          <p className="text-gray-300">Built with TypeScript for better development experience and fewer bugs.</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Responsive</h3>
          <p className="text-gray-300">Beautiful design that works perfectly on all devices and screen sizes.</p>
        </div>
      </div>

      {/* Projects Section (if available) */}
      {projects && projects.data.length > 0 && (
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-white mb-8">Our Projects</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.data.map((project: any) => (
              <div key={project.id} className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-[1.02]">
                {/* Cover Image */}
                {project.cover && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={`http://localhost:1337${project.cover.formats?.medium?.url || project.cover.url}`}
                      alt={project.cover.alternativeText || project.Title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  {/* Categories */}
                  {project.categories && project.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {project.categories.map((category: any) => (
                        <span
                          key={category.id}
                          className="px-3 py-1 text-xs font-semibold bg-blue-500/20 text-blue-300 rounded-full border border-blue-400/30"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Project Title */}
                  <h3 className="text-xl font-semibold text-white mb-3">{project.Title}</h3>
                  
                  {/* Description */}
                  <p className="text-gray-300 mb-4 line-clamp-3">{project.description}</p>
                  
                  {/* Additional Images Count */}
                  {project.images && project.images.length > 0 && (
                    <div className="flex items-center text-sm text-gray-400 mb-4">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {project.images.length} additional image{project.images.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  
                  {/* Date */}
                  <div className="text-sm text-gray-400">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="text-center py-16 mt-16">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
        <p className="text-gray-300 mb-8">Add more projects in Strapi to showcase your portfolio!</p>
        <a
          href="http://localhost:1337/admin"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 inline-block"
        >
          Open Strapi Admin
        </a>
      </div>
    </div>
  );
};

export default HomePage;
