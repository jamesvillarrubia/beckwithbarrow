/**
 * Navigation Component
 * 
 * A responsive navigation bar that:
 * - On homepage: transitions from transparent to white background when scrolling past 90% of viewport height
 * - On other pages: defaults to white background with black text (no scroll threshold)
 * - Dynamically loads navigation links from Strapi global settings
 * Provides smooth transitions and adapts text colors accordingly.
 */

import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

/**
 * Navigation item type definition
 */
interface NavItem {
  id: number;
  label: string;
  url: string;
  external: boolean;
  openInNewTab: boolean;
  order: number;
}

/**
 * NavLink Component - Renders either internal Link or external anchor
 */
interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  isScrolled: boolean;
  isMobile?: boolean;
}

const NavLink = ({ item, isActive, isScrolled, isMobile = false }: NavLinkProps) => {
  // Generate className based on context (mobile vs desktop)
  const linkClassName = isMobile
    ? `block py-3 px-4 font-serif text-md transition-colors duration-200 rounded-sm ${
        isActive
          ? 'text-black font-semibold bg-gray-200'
          : 'text-gray-800 hover:bg-gray-100'
      }`
    : `font-serif text-md transition-all duration-300 ease-in-out no-underline border-b-2 pb-1 ${
        isActive
          ? `${isScrolled ? 'text-black border-black' : 'text-white border-white'} font-semibold`
          : `${isScrolled 
              ? 'text-black border-transparent hover:border-gray-600' 
              : 'text-white border-transparent hover:border-gray-300'
            }`
      }`;

  // External links use <a> tag
  if (item.external) {
    return (
      <a
        href={item.url}
        target={item.openInNewTab ? '_blank' : '_self'}
        rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
        className={linkClassName}
      >
        {item.label}
      </a>
    );
  }

  // Internal links use React Router Link
  return (
    <Link to={item.url} className={linkClassName}>
      {item.label}
    </Link>
  );
};

const Navigation = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  // Initialize isScrolled based on whether we're on homepage or not
  const [isScrolled, setIsScrolled] = useState(!isHomePage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Fetch navigation links from menu
  const { navigation, isLoading } = useGlobalSettings();

  // Fallback navigation if API is loading or fails
  const fallbackNavItems = [
    { id: 1, label: 'Home', url: '/', external: false, openInNewTab: false, order: 0 },
    { id: 2, label: 'About', url: '/about', external: false, openInNewTab: false, order: 1 },
    { id: 3, label: 'Connect', url: '/connect', external: false, openInNewTab: false, order: 2 },
  ];

  const navItems: NavItem[] = isLoading || navigation.length === 0 
    ? fallbackNavItems 
    : navigation;

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

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${
      isScrolled || isMobileMenuOpen ? 'bg-white shadow-sm' : 'bg-transparent'
    }`} style={isScrolled || isMobileMenuOpen ? { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' } : {}}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className={`flex justify-start items-center ${isMobileMenuOpen ? 'h-0 md:h-16' : 'h-16'}`}>
          {/* Navigation Links - Left Aligned - Hidden on mobile */}
          <div className="hidden md:flex space-x-12">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                isActive={location.pathname === item.url}
                isScrolled={isScrolled}
              />
            ))}
          </div>

          {/* Mobile Menu Button - Only show hamburger when menu is closed */}
          {!isMobileMenuOpen && (
            <div className="md:hidden ml-auto">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className={`transition-colors duration-300 ease-in-out focus:outline-none ${
                  isScrolled
                    ? 'text-black hover:text-gray-600 focus:text-gray-600' 
                    : 'text-white hover:text-gray-300 focus:text-gray-300'
                }`}
                aria-label="Open menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white">
            {/* Close button positioned where hamburger was */}
            <div className="flex items-center h-16">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-auto text-black hover:text-gray-600 transition-colors duration-200 focus:outline-none"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu items */}
            <div className="pb-6 px-6 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.id}
                  item={item}
                  isActive={location.pathname === item.url}
                  isScrolled={isScrolled}
                  isMobile
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;