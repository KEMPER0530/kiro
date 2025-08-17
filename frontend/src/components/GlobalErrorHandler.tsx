import React, { useEffect, useRef } from 'react';
import anime from 'animejs';
import { useError, ErrorState } from '../contexts/ErrorContext';

interface ErrorToastProps {
  error: ErrorState;
  onDismiss: (id: string) => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ error, onDismiss }) => {
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toastRef.current) {
      // Animate toast entrance
      anime({
        targets: toastRef.current,
        translateX: [300, 0],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutExpo'
      });
    }
  }, []);

  const handleDismiss = () => {
    if (toastRef.current) {
      // Animate toast exit
      anime({
        targets: toastRef.current,
        translateX: [0, 300],
        opacity: [1, 0],
        duration: 300,
        easing: 'easeInExpo',
        complete: () => onDismiss(error.id)
      });
    } else {
      onDismiss(error.id);
    }
  };

  const getIconAndColors = () => {
    switch (error.type) {
      case 'error':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500',
          titleColor: 'text-red-800',
          textColor: 'text-red-700'
        };
      case 'warning':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-500',
          titleColor: 'text-yellow-800',
          textColor: 'text-yellow-700'
        };
      case 'info':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500',
          titleColor: 'text-blue-800',
          textColor: 'text-blue-700'
        };
    }
  };

  const { icon, bgColor, borderColor, iconColor, titleColor, textColor } = getIconAndColors();

  return (
    <div
      ref={toastRef}
      className={`max-w-sm w-full ${bgColor} border ${borderColor} rounded-lg shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${iconColor}`}>
            {icon}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={`text-sm font-medium ${titleColor}`}>
              {error.title}
            </p>
            <p className={`mt-1 text-sm ${textColor}`}>
              {error.message}
            </p>
            {error.retryAction && (
              <div className="mt-3">
                <button
                  onClick={error.retryAction}
                  className="text-sm bg-white px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  再試行
                </button>
              </div>
            )}
          </div>
          {error.dismissible && (
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={handleDismiss}
                className={`rounded-md inline-flex ${textColor} hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <span className="sr-only">閉じる</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const GlobalErrorHandler: React.FC = () => {
  const { errors, dismissError } = useError();

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {errors.map((error) => (
        <ErrorToast
          key={error.id}
          error={error}
          onDismiss={dismissError}
        />
      ))}
    </div>
  );
};