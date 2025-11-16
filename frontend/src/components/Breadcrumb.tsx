/**
 * Breadcrumb Component
 * 
 * Reusable breadcrumb navigation with back button functionality.
 * Provides consistent spacing and styling across all pages.
 * 
 * Features:
 * - Customizable back link text and destination
 * - Consistent spacing and styling
 * - Hover effects and transitions
 * - Accessible with aria-label
 */

import { useNavigate } from 'react-router-dom';

interface BreadcrumbProps {
  /** Text to display on the back button */
  label?: string;
  /** Path to navigate to when clicked */
  to?: string;
  /** Additional CSS classes */
  className?: string;
}

const Breadcrumb = ({ 
  label = 'Back to Projects', 
  to = '/',
  className = ''
}: BreadcrumbProps) => {
  const navigate = useNavigate();

  return (
    <section className={`py-16 px-6 md:px-12 lg:px-16 ${className}`}>
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate(to)}
          className="mb-8 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 mt-8 cursor-pointer"
          aria-label={label}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {label}
        </button>
      </div>
    </section>
  );
};

export default Breadcrumb;

