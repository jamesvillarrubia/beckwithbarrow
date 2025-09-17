/**
 * AboutPage Component
 * 
 * About page featuring:
 * - Consistent navigation and typography with homepage
 * - White theme with black text for readability
 * - Hero section with centered title
 * - Team photo section with placeholder for founding team image
 * - Team description paragraph section
 * - Maintains same spacing and layout principles as homepage
 */

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const AboutPage = () => {
  return (
    <div className="bg-white text-black">
      {/* Navigation */}
      <Navigation />

      {/* Team Photo Section */}
      <section className="py-16 pt-24">
        <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16">          
          {/* Team Photo Placeholder */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="aspect-[4/3] rounded-sm overflow-hidden">
              {/* Placeholder for team photo - will be replaced with actual image */}
              <img 
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=900&q=80"
                alt="Founding team of Beckwith Barrow"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      {/* Team Description Section */}
      <section className="py-16">
        
        <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-16 text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-light leading-relaxed text-gray-900 mt-8">
            About Our Studio
          </h1>
          <p className="text-lg md:text-xl font-sans text-gray-700 leading-relaxed mb-8">
            Founded by a passionate team of designers and architects, Beckwith Barrow emerged from a 
            shared vision to create spaces that seamlessly blend form and function. Our founders bring 
            together decades of combined experience in residential and commercial design, each contributing 
            their unique perspective and expertise to every project.
          </p>
          
          <p className="text-lg md:text-xl font-sans text-gray-700 leading-relaxed mb-8">
            What sets our team apart is our collaborative approach and commitment to understanding each 
            client's individual story. We believe that great design begins with great listening, and our 
            process is built around creating deep partnerships with those we serve. From initial concept 
            to final installation, we work closely with our clients to ensure every detail reflects their 
            vision and enhances their daily experience.
          </p>

          <p className="text-lg md:text-xl font-sans text-gray-700 leading-relaxed">
            Our team's diverse backgrounds in architecture, interior design, and project management allow 
            us to approach each project holistically, considering not just how a space looks, but how it 
            feels, functions, and evolves with the people who inhabit it. This comprehensive approach has 
            earned us recognition in the industry and, more importantly, the trust and satisfaction of our clients.
          </p>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16 text-center">
          <h3 className="text-4xl md:text-6xl font-serif font-light leading-relaxed text-gray-900">
            "Design is not just what it looks like and feels like. Design is how it works."
          </h3>
          <p className="text-xl md:text-2xl font-sans text-gray-600 mt-8 italic">
            — Steve Jobs
          </p>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AboutPage;
