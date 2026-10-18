import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { routeConfig } from './routes';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from './constants';
import { RouteErrorBoundary } from '../components/ErrorBoundary/RouteErrorBoundary';

/**
 * Loading fallback component for lazy-loaded routes
 */
function RouteLoadingFallback() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

/**
 * Main application router component.
 * Renders routes based on centralized configuration.
 * Each route is wrapped in its own RouteErrorBoundary so that an error in
 * one page does not blank the entire app — the navigation shell stays intact
 * and the user can navigate to another route.
 */
export function AppRouter() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {routeConfig.map((route) => {
          const Component = route.component;

          // Derive a human-readable name from the route path for error logging
          const routeName = route.title ?? route.path;

          const pageElement = (
            <RouteErrorBoundary routeName={routeName}>
              <Component />
            </RouteErrorBoundary>
          );

          const element = route.protected ? (
            <ProtectedRoute>{pageElement}</ProtectedRoute>
          ) : (
            pageElement
          );

          return <Route key={route.path} path={route.path} element={element} />;
        })}

        {/* Catch-all route for undefined paths */}
        <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
      </Routes>
    </Suspense>
  );
}
