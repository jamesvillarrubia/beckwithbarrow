/**
 * Logo Component
 * 
 * A scalable Beckwith Barrow logo using Figtree font with configurable sizing.
 * Uses predefined size configurations for consistent branding.
 * 
 * Features:
 * - Figtree font family with light weight and uppercase styling
 * - Configurable sizes: xs, sm, md, lg, xl, hero, or custom numeric multiplier
 * - Responsive line heights and spacing
 * - Color options: black or white
 * 
 * Designed to be easily convertible to SVG format.
 */

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero' | number;
  color?: 'white' | 'black';
  className?: string;
}

const Logo = ({ size = 'md', color = 'black', className = '' }: LogoProps) => {
  // Size configurations with exact pixel measurements
  const sizeConfigs = {
    xs: {
      firstLineSize: 18,
      secondLineSize: 16,
      lineHeight: 1.2,
      spacing: 2,
    },
    sm: {
      firstLineSize: 24,
      secondLineSize: 20,
      lineHeight: 1.2,
      spacing: 4,
    },
    md: {
      firstLineSize: 36,
      secondLineSize: 46,
      lineHeight: 0.7,
      spacing: 4,
    },
    lg: {
      firstLineSize: 48,
      secondLineSize: 40,
      lineHeight: 1.1,
      spacing: 8,
    },
    xl: {
      firstLineSize: 60,
      secondLineSize: 50,
      lineHeight: 1.0,
      spacing: 10,
    },
    hero: {
      firstLineSize: 90,
      secondLineSize: 115,
      lineHeight: 0.7,
      spacing: 12,
    },
  };

  let config;
  if (typeof size === 'number') {
    config = {
      firstLineSize: 18 * size,
      secondLineSize: 16 * size,
      lineHeight: 1.2 * size,
      spacing: 2 * size,
    };
  } else {
    config = sizeConfigs[size];
  }
  const textColor = color === 'white' ? '#ffffff' : '#000000';

  return (
    <div className={`font-serif text-center ${className}`}>
      <div 
        style={{
          fontSize: `${config.firstLineSize}px`,
          lineHeight: config.lineHeight,
          color: textColor,
          margin: 0,
          padding: 0,
          textTransform: 'uppercase',
        }}
      >
        Beckwith
      </div>
      <div 
        style={{
          fontSize: `${config.secondLineSize}px`,
          lineHeight: config.lineHeight,
          color: textColor,
          marginTop: `${config.spacing}px`,
          margin: 0,
          padding: 0,
          textTransform: 'uppercase',
        }}
      >
        Barrow
      </div>
    </div>
  );
};

export default Logo;
