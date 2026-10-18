/**
 * RouteErrorBoundary.test.tsx
 *
 * Verifies that:
 * 1. A thrown error in a child renders the fallback UI.
 * 2. The "Try Again" button resets the error state (re-renders the route).
 * 3. The onError callback is fired with the error details.
 * 4. Multiple independent RouteErrorBoundary instances are isolated — an
 *    error in one does not affect siblings (navigation shell stays usable).
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RouteErrorBoundary } from '../components/ErrorBoundary/RouteErrorBoundary';

// ── Test helpers ──────────────────────────────────────────────────────────────

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Route render failure');
  return <div>Route content</div>;
}

// Suppress intentional error output during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RouteErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <RouteErrorBoundary routeName="Test Route">
        <ThrowingChild shouldThrow={false} />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText('Route content')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <RouteErrorBoundary routeName="Failing Route">
        <ThrowingChild shouldThrow={true} />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('re-renders the route after clicking Try Again (reset)', () => {
    let shouldThrow = true;

    function ControlledChild() {
      if (shouldThrow) throw new Error('Controlled error');
      return <div>Recovered content</div>;
    }

    const { rerender } = render(
      <RouteErrorBoundary routeName="Dashboard">
        <ControlledChild />
      </RouteErrorBoundary>,
    );

    // Fallback is showing
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Stop throwing, then click retry
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    rerender(
      <RouteErrorBoundary routeName="Dashboard">
        <ControlledChild />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });

  it('calls the onError prop through the underlying ErrorBoundary', () => {
    // RouteErrorBoundary passes its own onError to ErrorBoundary internally.
    // We can verify the console.error call it makes (since it logs internally).
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <RouteErrorBoundary routeName="Profile">
        <ThrowingChild shouldThrow={true} />
      </RouteErrorBoundary>,
    );

    // The RouteErrorBoundary logs via console.error with a recognisable prefix
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[RouteErrorBoundary]'),
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('isolates errors — a sibling boundary is unaffected', () => {
    render(
      <div>
        <RouteErrorBoundary routeName="Sidebar">
          <div>Navigation shell</div>
        </RouteErrorBoundary>

        <RouteErrorBoundary routeName="Main Content">
          <ThrowingChild shouldThrow={true} />
        </RouteErrorBoundary>
      </div>,
    );

    // The navigation shell is still rendered
    expect(screen.getByText('Navigation shell')).toBeInTheDocument();

    // The failing route shows the fallback
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
