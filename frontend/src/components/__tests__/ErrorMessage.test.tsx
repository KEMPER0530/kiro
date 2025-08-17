import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ErrorMessage from '../ErrorMessage';

describe('ErrorMessage', () => {
  it('renders error message correctly', () => {
    const errorMessage = 'Something went wrong';
    
    render(<ErrorMessage message={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders with error icon', () => {
    render(<ErrorMessage message="Test error" />);
    
    const errorIcon = screen.getByTestId('error-icon');
    expect(errorIcon).toBeInTheDocument();
    expect(errorIcon).toHaveClass('text-red-500');
  });

  it('applies correct styling classes', () => {
    render(<ErrorMessage message="Test error" />);
    
    const container = screen.getByRole('alert');
    expect(container).toHaveClass('bg-red-50', 'border-red-200', 'text-red-700');
  });

  it('handles empty message gracefully', () => {
    render(<ErrorMessage message="" />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('')).toBeInTheDocument();
  });

  it('handles long error messages', () => {
    const longMessage = 'This is a very long error message that should be displayed properly without breaking the layout or causing any issues with the component rendering';
    
    render(<ErrorMessage message={longMessage} />);
    
    expect(screen.getByText(longMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders with proper accessibility attributes', () => {
    render(<ErrorMessage message="Accessibility test" />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('role', 'alert');
  });
});