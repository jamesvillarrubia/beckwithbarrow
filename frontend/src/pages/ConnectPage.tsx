/**
 * Connect Page Component
 * 
 * A contact/connection page for users to get in touch.
 * Features contact information from Strapi and a contact form.
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { apiService } from '../services/api';

interface ConnectData {
  email?: string;
  address?: string;
  phone?: string;
}

const ConnectPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Fetch connect data from Strapi
  const { data: connectData, isLoading } = useQuery({
    queryKey: ['connect'],
    queryFn: async () => {
      try {
        const result = await apiService.getSingleType('connect');
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
      // Send form data to API server
      const response = await fetch('http://localhost:3001/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Email sent successfully:', result);
        setSubmitStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        console.error('Email sending failed:', result);
        setSubmitStatus('error');
      }
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
      <div className="min-h-screen bg-white">
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

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl text-gray-900 mb-6">
            Let's Connect
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
            Ready to bring your vision to life? Get in touch and let's create something extraordinary together.
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-10 px-6 md:px-12 lg:px-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            
            {/* Contact Details */}
            <div>
              <h2 className="text-3xl font-semibold text-gray-900 mb-8">Get In Touch</h2>
              
              <div className="space-y-6">
                {connect?.email && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Email</h3>
                    <a 
                      href={`mailto:${connect.email}`}
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {connect.email}
                    </a>
                  </div>
                )}
                
                {connect?.phone && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Phone</h3>
                    <a 
                      href={`tel:${connect.phone}`}
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {connect.phone}
                    </a>
                  </div>
                )}
                
                {connect?.address && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Location</h3>
                    <p className="text-gray-600">{connect.address}</p>
                  </div>
                )}

                {/* Fallback if no Strapi data */}
                {!connect?.email && !connect?.phone && !connect?.address && (
                  <>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Email</h3>
                      <p className="text-gray-600">hello@beckwithbarrow.com</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Phone</h3>
                      <p className="text-gray-600">+1 (555) 123-4567</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Location</h3>
                      <p className="text-gray-600">San Francisco, CA</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-semibold text-gray-900 mb-8">Send a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Tell us about your project..."
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-6 rounded-lg transition-colors ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>

                {/* Status Messages */}
                {submitStatus === 'success' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">Message sent successfully!</p>
                    <p className="text-green-700 text-sm mt-1">
                      Thank you for reaching out. We'll get back to you soon.
                    </p>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium">Failed to send message</p>
                    <p className="text-red-700 text-sm mt-1">
                      Please try again or contact us directly.
                    </p>
                  </div>
                )}
              </form>
            </div>
            
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ConnectPage;