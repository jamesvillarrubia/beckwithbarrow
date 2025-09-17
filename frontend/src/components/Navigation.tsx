/**
 * Navigation Component
 * 
 * A responsive navigation bar that:
 * - On homepage: transitions from transparent to white background when scrolling past 90% of viewport height
 * - On other pages: defaults to white background with black text (no scroll threshold)
 * Provides smooth transitions and adapts text colors accordingly.
 */

import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Navigation = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  // Initialize isScrolled based on whether we're on homepage or not
  const [isScrolled, setIsScrolled] = useState(!isHomePage);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Connect', path: '/connect' },
  ];

  useEffect(() => {
    // Set initial state based on page type
    if (!isHomePage) {
      setIsScrolled(true); // Always show white nav for non-home pages
      return;
    }

    // Homepage scroll behavior
    setIsScrolled(false); // Reset to transparent for homepage
    
    const handleScroll = () => {
      const scrollThreshold = window.innerHeight * 0.9; // 90% of viewport height
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Check initial scroll position for homepage
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
      isScrolled ? 'bg-white shadow-sm' : 'bg-transparent'
    }`} style={isScrolled ? { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' } : {}}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="flex justify-start items-center h-16">
          {/* Navigation Links - Left Aligned */}
          <div className="flex space-x-12">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`font-serif text-md transition-all duration-300 ease-in-out no-underline border-b-2 pb-1 ${
                  location.pathname === item.path
                    ? `${isScrolled ? 'text-black border-black' : 'text-white border-white'} font-semibold`
                    : `${isScrolled 
                        ? 'text-black border-transparent hover:border-gray-600' 
                        : 'text-white border-transparent hover:border-gray-300'
                      }`
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden ml-auto">
            <button
              type="button"
              className={`transition-colors duration-300 ease-in-out focus:outline-none ${
                isScrolled 
                  ? 'text-black hover:text-gray-600 focus:text-gray-600' 
                  : 'text-white hover:text-gray-300 focus:text-gray-300'
              }`}
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;