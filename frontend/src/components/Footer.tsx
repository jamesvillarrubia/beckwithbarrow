/**
 * Footer Component
 * 
 * A clean white footer featuring the Beckwith Barrow logo, navigation menu,
 * and a "Connect with us" call-to-action button with black outline styling.
 * 
 * Dynamically loads navigation links from Strapi Menu single type.
 */

import { Link } from 'react-router-dom';
import Logo from './Logo';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

const Footer = () => {
  // Fetch navigation links from menu
  const { navigation, isLoading } = useGlobalSettings();

  // Fallback navigation if API is loading or fails
  const fallbackNavItems = [
    { id: 1, label: 'Home', url: '/', external: false, openInNewTab: false, order: 0 },
    { id: 2, label: 'About', url: '/about', external: false, openInNewTab: false, order: 1 },
    { id: 3, label: 'Connect', url: '/connect', external: false, openInNewTab: false, order: 2 },
  ];

  const navItems = isLoading || navigation.length === 0 
    ? fallbackNavItems 
    : navigation;

  return (
    <footer className="bg-white border-t border-gray-200 py-16">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="flex flex-col items-center text-center space-y-8">
          
          {/* Logo */}
          <Logo size="md" color="black" />

          {/* Navigation Menu */} 
          <nav className="flex space-x-8">
            {navItems.map((item) => {
              const linkClassName = "font-serif text-black hover:text-gray-600 transition-colors text-lg";

              // External links use <a> tag
              if (item.external) {
                return (
                  <a
                    key={item.id}
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
                <Link
                  key={item.id}
                  to={item.url}
                  className={linkClassName}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Connect with us Link */}
          <Link 
            to="/connect"
            className="border-2 border-black text-black bg-white font-serif px-8 py-3 rounded-lg hover:text-white hover:bg-black cursor-pointer transition-all duration-300 text-lg inline-block"
          >
            Connect with us
          </Link>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
