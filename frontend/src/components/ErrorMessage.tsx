import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'エラーが発生しました',
  message,
  onRetry,
  className = ''
}) => {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate error message entrance
    if (errorRef.current) {
      anime({
        targets: errorRef.current,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 400,
        easing: 'easeOutExpo'
      });
    }
  }, []);

  return (
    <div ref={errorRef} className={`card ${className}`}>
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 mb-4">
          {message}
        </p>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-primary"
          >
            再試行
          </button>
        )}
      </div>
    </div>
  );
};