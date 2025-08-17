import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock YouTube IFrame API
Object.defineProperty(window, 'YT', {
  value: {
    Player: vi.fn(),
    PlayerState: {
      UNSTARTED: -1,
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5
    }
  },
  writable: true
});

// Mock requestFullscreen
Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
  value: vi.fn(),
  writable: true
});

// Mock exitFullscreen
Object.defineProperty(document, 'exitFullscreen', {
  value: vi.fn(),
  writable: true
});

// Mock fullscreenElement
Object.defineProperty(document, 'fullscreenElement', {
  value: null,
  writable: true
});