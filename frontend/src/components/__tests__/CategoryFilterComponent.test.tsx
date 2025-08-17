import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CategoryFilterComponent } from '../CategoryFilterComponent';
import { Category } from '../../types';

// Mock animejs
vi.mock('animejs', () => ({
  default: vi.fn(() => ({}))
}));

const mockCategories: Category[] = [
  {
    id: 'gameplay',
    name: 'ゲームプレイ',
    searchTerms: ['gameplay', 'プレイ', 'プレー']
  },
  {
    id: 'tips',
    name: '攻略・コツ',
    searchTerms: ['tips', 'guide', '攻略', 'コツ', 'テクニック']
  }
];

describe('CategoryFilterComponent', () => {
  it('renders categories correctly', () => {
    const mockOnCategoryChange = vi.fn();
    
    render(
      <CategoryFilterComponent
        categories={mockCategories}
        selectedCategory=""
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByText('カテゴリフィルター')).toBeInTheDocument();
    expect(screen.getByText('ゲームプレイ')).toBeInTheDocument();
    expect(screen.getByText('攻略・コツ')).toBeInTheDocument();
  });

  it('calls onCategoryChange when category is clicked', () => {
    const mockOnCategoryChange = vi.fn();
    
    render(
      <CategoryFilterComponent
        categories={mockCategories}
        selectedCategory=""
        onCategoryChange={mockOnCategoryChange}
      />
    );

    fireEvent.click(screen.getByText('ゲームプレイ'));
    expect(mockOnCategoryChange).toHaveBeenCalledWith('ゲームプレイ');
  });

  it('shows selected category state correctly', () => {
    const mockOnCategoryChange = vi.fn();
    
    render(
      <CategoryFilterComponent
        categories={mockCategories}
        selectedCategory="ゲームプレイ"
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(screen.getByText('選択中: ゲームプレイ')).toBeInTheDocument();
  });

  it('clears selection when clear button is clicked', () => {
    const mockOnCategoryChange = vi.fn();
    
    render(
      <CategoryFilterComponent
        categories={mockCategories}
        selectedCategory="ゲームプレイ"
        onCategoryChange={mockOnCategoryChange}
      />
    );

    fireEvent.click(screen.getByText('すべてクリア'));
    expect(mockOnCategoryChange).toHaveBeenCalledWith('');
  });
});