import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  overlay?: boolean;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
  overlay = false,
  fullScreen = false
}) => {
  const spinnerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  useEffect(() => {
    if (spinnerRef.current) {
      // Animate spinner entrance
      anime({
        targets: spinnerRef.current,
        scale: [0, 1],
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutBack'
      });
    }

    if (textRef.current) {
      // Animate text entrance with slight delay
      anime({
        targets: textRef.current,
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 400,
        delay: 150,
        easing: 'easeOutExpo'
      });
    }
  }, []);

  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        ref={spinnerRef}
        className={`animate-spin rounded-full border-2 border-gray-200 border-t-blue-600 ${sizeClasses[size]}`}
      />
      {text && (
        <span
          ref={textRef}
          className={`mt-3 text-gray-600 ${textSizeClasses[size]} font-medium`}
        >
          {text}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {spinnerContent}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

// Skeleton loading component for content placeholders
interface SkeletonProps {
  className?: string;
  count?: number;
  height?: string;
  width?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  count = 1,
  height = 'h-4',
  width = 'w-full'
}) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`animate-pulse bg-gray-200 rounded ${height} ${width} ${className} ${
        index > 0 ? 'mt-2' : ''
      }`}
    />
  ));

  return <div>{skeletons}</div>;
};

// Video card skeleton for video lists
export const VideoCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-gray-200" />
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded mb-2" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
};