import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../Navigation';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/search' })
  };
});

const NavigationWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Navigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders all navigation links', () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );
    
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );
    
    const searchLink = screen.getByText('Search').closest('button');
    expect(searchLink).toHaveClass('bg-blue-100', 'text-blue-700');
  });

  it('navigates to search page when search button is clicked', () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );
    
    fireEvent.click(screen.getByText('Search'));
    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('navigates to categories page when categories button is clicked', () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );
    
    fireEvent.click(screen.getByText('Categories'));
    expect(mockNavigate).toHaveBeenCalledWith('/categories');
  });

  it('navigates to favorites page when favorites button is clicked', () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );
    
    fireEvent.click(screen.getByText('Favorites'));
    expect(mockNavigate).toHaveBeenCalledWith('/favorites');
  });

  it('navigates to statistics page when statistics button is clicked', () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );
    
    fireEvent.click(screen.getByText('Statistics'));
    expect(mockNavigate).toHaveBeenCalledWith('/statistics');
  });

  it('renders with proper accessibility attributes', () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );
    
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  it('applies responsive design classes', () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('bg-white', 'shadow-sm', 'border-b');
    
    const container = nav.querySelector('.container');
    expect(container).toHaveClass('mx-auto', 'px-4');
  });

  it('shows icons for each navigation item', () => {
    render(
      <NavigationWrapper>
        <Navigation />
      </NavigationWrapper>
    );
    
    // Check for search icon
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    // Check for categories icon
    expect(screen.getByTestId('categories-icon')).toBeInTheDocument();
    // Check for favorites icon
    expect(screen.getByTestId('favorites-icon')).toBeInTheDocument();
    // Check for statistics icon
    expect(screen.getByTestId('statistics-icon')).toBeInTheDocument();
  });
});