/**
 * Connect Page Component
 * 
 * A contact/connection page for users to get in touch.
 * Features contact information from Strapi and a contact form.
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Breadcrumb from '../components/Breadcrumb';
import { apiService } from '../services/api';
import { useRecaptcha } from '../hooks/useRecaptcha';

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
  const recaptchaRef = useRef<number | null>(null);
  
  // Lazy load reCAPTCHA only on this page
  const { isLoaded: recaptchaLoaded, error: recaptchaError } = useRecaptcha();

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
    retry: 3, // Increase retries for cold starts
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff: 1s, 2s, 4s
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const connect = connectData?.data as ConnectData;

  // Render reCAPTCHA widget once loaded
  useEffect(() => {
    if (recaptchaLoaded && window.grecaptcha && !recaptchaRef.current) {
      try {
        recaptchaRef.current = window.grecaptcha.render('recaptcha-container', {
          sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
          size: 'invisible',
          callback: handleRecaptchaSuccess,
        });
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error);
      }
    }
  }, [recaptchaLoaded]);

  // Handle reCAPTCHA success callback
  const handleRecaptchaSuccess = async (token: string) => {
    try {
      // Send form data with reCAPTCHA token to API server
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          recaptchaToken: token,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Email sent successfully:', result);
        setSubmitStatus('success');
        setFormData({ name: '', email: '', message: '' });
        // Reset reCAPTCHA for next submission
        if (recaptchaRef.current !== null) {
          window.grecaptcha.reset(recaptchaRef.current);
        }
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't submit if reCAPTCHA isn't loaded yet
    if (!recaptchaLoaded || recaptchaError) {
      console.error('reCAPTCHA not available');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Execute reCAPTCHA (will call handleRecaptchaSuccess on success)
      if (recaptchaRef.current !== null) {
        window.grecaptcha.execute(recaptchaRef.current);
      } else {
        throw new Error('reCAPTCHA not initialized');
      }
    } catch (error) {
      console.error('reCAPTCHA execution error:', error);
      setSubmitStatus('error');
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

      {/* Breadcrumb Navigation */}
      <Breadcrumb />
      
      {/* Hero Section */}
      <section className="py-16 px-6 md:px-12 lg:px-16">
        <div className="max-w-6xl mx-auto text-center">
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
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            
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
            <div className="md:col-span-2">
              <h2 className="text-3xl font-semibold text-gray-900 mb-8">Send a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name and Email side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                
                {/* Message field full width */}
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
                    placeholder="Tell us about your project..."
                  />
                </div>
                
                {/* Invisible reCAPTCHA container */}
                <div id="recaptcha-container"></div>
                
                <button
                  type="submit"
                  disabled={isSubmitting || !recaptchaLoaded}
                  className={`w-full py-3 px-6 rounded-lg transition-colors ${
                    isSubmitting || !recaptchaLoaded
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {isSubmitting ? 'Sending...' : !recaptchaLoaded ? 'Loading...' : 'Send Message'}
                </button>

                {/* reCAPTCHA Error Message */}
                {recaptchaError && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-medium">Security verification unavailable</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Please refresh the page or contact us directly.
                    </p>
                  </div>
                )}

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
            {/* <div>
              <h2 className="text-3xl font-semibold text-gray-900 mb-8">Environment Variables</h2>
                <p>{import.meta.env.RESEND_API_KEY}</p>
                <p>{import.meta.env.CONTACT_EMAIL}</p>
                <p>{import.meta.env.VITE_USE_PROD_API}</p>
                <p>{import.meta.env.VITE_PROD_API_URL}</p>
            </div> */}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ConnectPage;