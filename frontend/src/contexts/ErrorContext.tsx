import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface ErrorState {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  retryAction?: () => void;
  dismissible?: boolean;
  timestamp: number;
}

interface ErrorContextState {
  errors: ErrorState[];
  showError: (error: Omit<ErrorState, 'id' | 'timestamp'>) => string;
  dismissError: (id: string) => void;
  clearAllErrors: () => void;
}

type ErrorAction =
  | { type: 'ADD_ERROR'; payload: ErrorState }
  | { type: 'DISMISS_ERROR'; payload: string }
  | { type: 'CLEAR_ALL_ERRORS' };

const ErrorContext = createContext<ErrorContextState | undefined>(undefined);

const errorReducer = (state: ErrorState[], action: ErrorAction): ErrorState[] => {
  switch (action.type) {
    case 'ADD_ERROR':
      // Limit to 5 errors maximum
      const newErrors = [action.payload, ...state].slice(0, 5);
      return newErrors;
    case 'DISMISS_ERROR':
      return state.filter(error => error.id !== action.payload);
    case 'CLEAR_ALL_ERRORS':
      return [];
    default:
      return state;
  }
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, dispatch] = useReducer(errorReducer, []);

  const showError = (error: Omit<ErrorState, 'id' | 'timestamp'>): string => {
    const id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const errorWithId: ErrorState = {
      ...error,
      id,
      timestamp: Date.now(),
      dismissible: error.dismissible ?? true,
    };

    dispatch({ type: 'ADD_ERROR', payload: errorWithId });

    // Auto-dismiss after 10 seconds for dismissible errors
    if (errorWithId.dismissible) {
      setTimeout(() => {
        dispatch({ type: 'DISMISS_ERROR', payload: id });
      }, 10000);
    }

    return id;
  };

  const dismissError = (id: string) => {
    dispatch({ type: 'DISMISS_ERROR', payload: id });
  };

  const clearAllErrors = () => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' });
  };

  const value: ErrorContextState = {
    errors,
    showError,
    dismissError,
    clearAllErrors,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = (): ErrorContextState => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};