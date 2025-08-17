import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorProvider, useError } from '../../contexts/ErrorContext';
import { GlobalErrorHandler } from '../GlobalErrorHandler';

// Test component to trigger errors
const TestComponent: React.FC = () => {
  const { showError } = useError();

  const handleShowError = () => {
    showError({
      type: 'error',
      title: 'Test Error',
      message: 'This is a test error message',
      retryAction: () => console.log('Retry clicked')
    });
  };

  const handleShowWarning = () => {
    showError({
      type: 'warning',
      title: 'Test Warning',
      message: 'This is a test warning message'
    });
  };

  return (
    <div>
      <button onClick={handleShowError}>Show Error</button>
      <button onClick={handleShowWarning}>Show Warning</button>
    </div>
  );
};

describe('GlobalErrorHandler', () => {
  it('should display error toast when error is shown', () => {
    render(
      <ErrorProvider>
        <TestComponent />
        <GlobalErrorHandler />
      </ErrorProvider>
    );

    // Trigger error
    fireEvent.click(screen.getByText('Show Error'));

    // Check if error toast is displayed
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('This is a test error message')).toBeInTheDocument();
    expect(screen.getByText('再試行')).toBeInTheDocument();
  });

  it('should display warning toast when warning is shown', () => {
    render(
      <ErrorProvider>
        <TestComponent />
        <GlobalErrorHandler />
      </ErrorProvider>
    );

    // Trigger warning
    fireEvent.click(screen.getByText('Show Warning'));

    // Check if warning toast is displayed
    expect(screen.getByText('Test Warning')).toBeInTheDocument();
    expect(screen.getByText('This is a test warning message')).toBeInTheDocument();
  });

  it('should dismiss error when close button is clicked', () => {
    render(
      <ErrorProvider>
        <TestComponent />
        <GlobalErrorHandler />
      </ErrorProvider>
    );

    // Trigger error
    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Test Error')).toBeInTheDocument();

    // Click close button
    const closeButton = screen.getByRole('button', { name: '閉じる' });
    fireEvent.click(closeButton);

    // Error should be dismissed (this might need a wait due to animation)
    expect(screen.queryByText('Test Error')).not.toBeInTheDocument();
  });
});