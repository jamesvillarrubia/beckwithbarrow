/**
 * ArchBackground Component
 * 
 * A React component that renders the arch SVG as a scalable background element.
 * Designed to be used as a full-cover background with customizable positioning and styling.
 * 
 * Features:
 * - Responsive scaling to cover entire container
 * - Customizable stroke color and opacity
 * - Position control for different layout needs
 * - Preserves original SVG proportions
 */

import React from 'react';

interface ArchBackgroundProps {
  /** CSS class name for additional styling */
  className?: string;
  /** Stroke color for the arch paths (default: #979797) */
  strokeColor?: string;
  /** Stroke width for the arch paths (default: 1) */
  strokeWidth?: number;
  /** Opacity of the entire arch (default: 1) */
  opacity?: number;
  /** Position of the arch within its container */
  position?: 'center' | 'left' | 'right' | 'top' | 'bottom';
  /** Whether to scale the arch to cover the full container */
  cover?: boolean;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

const ArchBackground: React.FC<ArchBackgroundProps> = ({
  className = '',
  strokeColor = '#979797',
  strokeWidth = 1,
  opacity = 1,
  position = 'center',
  cover = true,
  style = {},
}) => {
  // Calculate position classes based on position prop
  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return 'left-0 top-1/2 -translate-y-1/2';
      case 'right':
        return 'right-0 top-1/2 -translate-y-1/2';
      case 'top':
        return 'top-0 left-1/2 -translate-x-1/2';
      case 'bottom':
        return 'bottom-0 left-1/2 -translate-x-1/2';
      case 'center':
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  // Calculate size classes based on cover prop
  const getSizeClasses = () => {
    if (cover) {
      return 'w-full h-full';
    }
    return 'w-auto h-auto max-w-full max-h-full';
  };

  return (
    <div
      className={`absolute ${getPositionClasses()} ${getSizeClasses()} ${className}`}
      style={{ opacity, ...style }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 408 1131"
        preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          {/* Bottom arch path */}
          <path
            d="M107.5,1130.5 C107.5,1098 107.5,268.5 107.5,261 C107.5,178.157288 174.657288,111 257.5,111 C340.342712,111 406.155286,176.820858 407.479904,258.519476"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Top arch path */}
          <path
            d="M399.202003,0.00112643274 C386.011756,98.2422505 301.852963,174 200,174 C98.1470368,174 13.9882441,98.2422505 0.79799657,0.00112643274"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
};

export default ArchBackground;
