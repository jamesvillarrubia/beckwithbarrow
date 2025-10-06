/**
 * AnimatedSection Component
 * 
 * A wrapper component that provides fade-in and slide-up animations
 * as the element comes into view during scrolling.
 * 
 * Features:
 * - Configurable animation options
 * - Smooth, subtle effects
 * - Performance optimized with Intersection Observer
 * - Reusable across different page sections
 */

import React from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  delay?: number;
  duration?: number;
  as?: keyof JSX.IntrinsicElements;
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className = '',
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  delay = 0,
  duration = 600,
  as: Component = 'div'
}) => {
  const { elementRef, animationStyle } = useScrollAnimation({
    threshold,
    rootMargin,
    delay,
    duration
  });

  return (
    <Component
      ref={elementRef}
      className={className}
      style={animationStyle}
    >
      {children}
    </Component>
  );
};

export default AnimatedSection;
