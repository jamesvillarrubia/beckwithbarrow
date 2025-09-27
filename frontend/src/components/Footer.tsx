/**
 * Footer Component
 * 
 * A clean white footer featuring the Beckwith Barrow logo, navigation menu,
 * and a "Connect with us" call-to-action button with black outline styling.
 */

import { Link } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => {
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Connect', path: '/connect' },
  ];

  return (
    <footer className="bg-white border-t border-gray-200 py-16">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="flex flex-col items-center text-center space-y-8">
          
          {/* Logo */}
          <Logo size="md" color="black" />

          {/* Navigation Menu */}th 
          <nav className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="font-serif text-black hover:text-gray-600 transition-colors text-lg"
              >
                {item.name}
              </Link>
            ))}
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
