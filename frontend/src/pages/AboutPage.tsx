import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const AboutPage = () => {
  // Try to fetch about content from Strapi
  const { data: aboutData, isLoading } = useQuery({
    queryKey: ['about'],
    queryFn: () => apiService.getItem('about', ''),
    retry: false,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-16">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          About{' '}
          <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Us
          </span>
        </h1>
        
        {aboutData ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-left">
            <div className="prose prose-invert max-w-none">
              {aboutData.data.attributes.content && (
                <div className="text-gray-300 leading-relaxed">
                  {aboutData.data.attributes.content}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              This is the about page. You can manage this content through your Strapi admin panel.
              Create an "About" single type in Strapi to customize this content.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 mt-12">
              <div className="text-left">
                <h3 className="text-2xl font-semibold text-white mb-4">Our Mission</h3>
                <p className="text-gray-300 leading-relaxed">
                  We're building modern web experiences with cutting-edge technologies. 
                  Our stack includes Strapi for content management, React for the frontend, 
                  and Tailwind CSS for beautiful, responsive design.
                </p>
              </div>
              
              <div className="text-left">
                <h3 className="text-2xl font-semibold text-white mb-4">Technology Stack</h3>
                <ul className="text-gray-300 space-y-2">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                    Strapi CMS for content management
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    React with TypeScript
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                    Vite for fast development
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-pink-400 rounded-full mr-3"></span>
                    Tailwind CSS for styling
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                    TanStack Query for data fetching
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 text-center">
              <a
                href="http://localhost:1337/admin/content-manager/single-types/api::about.about"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 inline-block"
              >
                Edit About Content in Strapi
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AboutPage;
