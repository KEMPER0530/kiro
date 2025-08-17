import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SearchComponent from '../SearchComponent';

describe('SearchComponent', () => {
  const mockOnSearch = vi.fn();
  const mockOnCategoryChange = vi.fn();

  const defaultProps = {
    onSearch: mockOnSearch,
    onCategoryChange: mockOnCategoryChange,
    loading: false,
    selectedCategory: '',
    searchQuery: ''
  };

  beforeEach(() => {
    mockOnSearch.mockClear();
    mockOnCategoryChange.mockClear();
  });

  it('renders search input and category filter', () => {
    render(<SearchComponent {...defaultProps} />);
    
    expect(screen.getByPlaceholderText(/search for efootball videos/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('displays current search query in input', () => {
    render(<SearchComponent {...defaultProps} searchQuery="test query" />);
    
    const input = screen.getByDisplayValue('test query');
    expect(input).toBeInTheDocument();
  });

  it('calls onSearch when search button is clicked', async () => {
    render(<SearchComponent {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/search for efootball videos/i);
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(input, { target: { value: 'gameplay' } });
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('gameplay', '');
    });
  });

  it('calls onSearch when Enter key is pressed in input', async () => {
    render(<SearchComponent {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/search for efootball videos/i);
    
    fireEvent.change(input, { target: { value: 'tips' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('tips', '');
    });
  });

  it('calls onCategoryChange when category is selected', async () => {
    render(<SearchComponent {...defaultProps} />);
    
    const categorySelect = screen.getByRole('combobox');
    
    fireEvent.change(categorySelect, { target: { value: 'gameplay' } });
    
    await waitFor(() => {
      expect(mockOnCategoryChange).toHaveBeenCalledWith('gameplay');
    });
  });

  it('shows loading state when loading prop is true', () => {
    render(<SearchComponent {...defaultProps} loading={true} />);
    
    const searchButton = screen.getByRole('button', { name: /searching/i });
    expect(searchButton).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('disables search button when loading', () => {
    render(<SearchComponent {...defaultProps} loading={true} />);
    
    const searchButton = screen.getByRole('button');
    expect(searchButton).toBeDisabled();
  });

  it('renders all category options', () => {
    render(<SearchComponent {...defaultProps} />);
    
    const categorySelect = screen.getByRole('combobox');
    
    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByText('Gameplay')).toBeInTheDocument();
    expect(screen.getByText('Tips & Guides')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();
    expect(screen.getByText('News')).toBeInTheDocument();
  });

  it('shows selected category in dropdown', () => {
    render(<SearchComponent {...defaultProps} selectedCategory="gameplay" />);
    
    const categorySelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(categorySelect.value).toBe('gameplay');
  });

  it('handles empty search query', async () => {
    render(<SearchComponent {...defaultProps} />);
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('', '');
    });
  });

  it('trims whitespace from search query', async () => {
    render(<SearchComponent {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/search for efootball videos/i);
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(input, { target: { value: '  gameplay  ' } });
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('gameplay', '');
    });
  });

  it('has proper accessibility attributes', () => {
    render(<SearchComponent {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/search for efootball videos/i);
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('aria-label', 'Search for eFootball videos');
    
    const categorySelect = screen.getByRole('combobox');
    expect(categorySelect).toHaveAttribute('aria-label', 'Select category');
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toHaveAttribute('type', 'button');
  });

  it('applies correct styling classes', () => {
    render(<SearchComponent {...defaultProps} />);
    
    const container = screen.getByTestId('search-component');
    expect(container).toHaveClass('bg-white', 'rounded-lg', 'shadow-md');
    
    const input = screen.getByPlaceholderText(/search for efootball videos/i);
    expect(input).toHaveClass('flex-1', 'px-4', 'py-2', 'border', 'rounded-l-lg');
  });
});