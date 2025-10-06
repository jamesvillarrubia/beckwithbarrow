/**
 * useScrollAnimation Hook
 * 
 * A custom hook that provides fade-in and slide-up animations
 * as elements come into view during scrolling.
 * 
 * Features:
 * - Intersection Observer for performance
 * - Configurable animation options
 * - CSS class-based animations
 * - Smooth, subtle effects
 */

import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number; // How much of the element must be visible (0-1)
  rootMargin?: string; // Margin around the root element
  delay?: number; // Delay before animation starts (ms)
  duration?: number; // Animation duration (ms)
}

export const useScrollAnimation = (options: UseScrollAnimationOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    delay = 0,
    duration = 600
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setTimeout(() => {
            setIsVisible(true);
            setHasAnimated(true);
          }, delay);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, delay, hasAnimated]);

  const animationStyle = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`
  };

  return {
    elementRef,
    isVisible,
    animationStyle
  };
};

export default useScrollAnimation;
