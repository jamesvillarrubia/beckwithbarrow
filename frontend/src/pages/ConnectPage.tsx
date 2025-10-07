/**
 * ConnectPage Component
 * 
 * A dedicated page for displaying contact information from the connect single type.
 * Fetches and displays contact details including email, address, and phone.
 * 
 * Features:
 * - Fetches connect data from Strapi API
 * - Displays contact information in a clean layout
 * - Responsive design with proper typography
 * - Scroll animations for enhanced UX
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Footer from '../components/Footer';
import Navigation from '../components/Navigation';
import AnimatedSection from '../components/AnimatedSection';
import { apiService } from '../services/api';

interface ConnectData {
  email?: string;
  address?: string;
  phone?: string;
}

const ConnectPage = () => {
  const [showDebug, setShowDebug] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Fetch connect data
  const { data: connectData, isLoading, error } = useQuery({
    queryKey: ['connect'],
    queryFn: async () => {
      console.log('Fetching connect data from API...');
      try {
        const result = await apiService.getSingleType('connect');
        console.log('Connect API Response:', result);
        return result;
      } catch (err) {
        console.error('Connect API Error:', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const connect = connectData?.data as ConnectData;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // For now, we'll just simulate a submission
      // In a real implementation, you'd send this to your API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Form submission:', formData);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-white text-black">
        <Navigation />
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading contact information...</p>
          </div>
        </div>
        <Footer />
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
            <p className="text-red-600 text-lg">Unable to load contact information</p>
            <p className="text-gray-500 text-sm mt-2">Please try again later</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white text-black">
      {/* Navigation */}
      <Navigation />
      
      {/* Connect Header */}
      <AnimatedSection as="section" className="py-24 px-6 md:px-12 lg:px-16" delay={100}>
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="mb-8 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Page Title */}
          <h1 className="text-4xl md:text-6xl font-serif font-light leading-tight text-gray-900 mb-12">
            Connect
          </h1>

          {/* Contact Information */}
          <div className="space-y-8">
            {connect?.email && (
              <AnimatedSection delay={200}>
                <div className="border-l-4 border-gray-200 pl-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Email</h3>
                  <a 
                    href={`mailto:${connect.email}`}
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {connect.email}
                  </a>
                </div>
              </AnimatedSection>
            )}

            {connect?.phone && (
              <AnimatedSection delay={300}>
                <div className="border-l-4 border-gray-200 pl-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Phone</h3>
                  <a 
                    href={`tel:${connect.phone}`}
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {connect.phone}
                  </a>
                </div>
              </AnimatedSection>
            )}

            {connect?.address && (
              <AnimatedSection delay={400}>
                <div className="border-l-4 border-gray-200 pl-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Address</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {connect.address}
                  </p>
                </div>
              </AnimatedSection>
            )}
          </div>
        </div>
      </AnimatedSection>

      {/* Contact Form Section */}
      <AnimatedSection as="section" className="py-16 px-6 md:px-12 lg:px-16 bg-gray-50" delay={500}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-light text-gray-900 mb-4">
              Get In Touch
            </h2>
            <p className="text-lg text-gray-600">
              We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                  placeholder="Your full name"
                />
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="mb-6">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Message Field */}
            <div className="mb-8">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 resize-vertical"
                placeholder="Tell us about your project, timeline, and any specific requirements..."
              />
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-8 py-4 rounded-lg font-medium transition-all duration-200 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white hover:shadow-lg'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </span>
                ) : (
                  'Send Message'
                )}
              </button>
            </div>

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Message sent successfully!</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Thank you for reaching out. We'll get back to you soon.
                </p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="font-medium">Failed to send message</span>
                </div>
                <p className="text-red-700 text-sm mt-1">
                  Please try again or contact us directly.
                </p>
              </div>
            )}
          </form>
        </div>
      </AnimatedSection>

      {/* Debug Section - Only show in development */}
      {import.meta.env.DEV && (
        <section className="py-8 px-6 md:px-12 lg:px-16 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
            >
              {showDebug ? 'Hide' : 'Show'} Debug Info
            </button>

            {showDebug && (
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Connect Data (Full Raw API Response)</h3>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
                  <pre className="text-xs">
                    {JSON.stringify(connectData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ConnectPage;