/**
 * Render Helpers - Utilities for rendering components in tests
 *
 * This module provides helper functions for rendering React components
 * with common providers and contexts in tests.
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Custom render function with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient;
  }
) {
  const queryClient =
    options?.queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

  function AllTheProviders({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Re-export testing library utilities
 */
export { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
