import { Box } from '@mui/material';
import { Suspense, type JSX } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RouteBoundary } from './RouteBoundary';
import { RouteLoadingFallback } from './RouteLoadingFallback';
import { routeConfig } from './routes';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
import { ROUTES } from './constants';
import { ProtectedRoute } from './ProtectedRoute';
import { RouteBoundary } from './RouteBoundary';
import { routeConfig } from './routes';
import { Skeleton } from '../components/Skeleton/Skeleton';

/**
 * Main application router component.
 * Renders routes based on centralized configuration.
 */
export function AppRouter() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {routeConfig.map((route) => {
          const Component = route.component;
          let element: JSX.Element;
          if (route.adminOnly) {
            element = (
              <RouteBoundary>
                <AdminRoute>
                  <Component />
                </AdminRoute>
              </RouteBoundary>
            );
          } else if (route.protected) {
            element = (
              <RouteBoundary>
                <ProtectedRoute>
                  <Component />
                </ProtectedRoute>
              </RouteBoundary>
            );
          } else {
            element = (
              <RouteBoundary>
                <Component />
              </RouteBoundary>
            );
          }

          return <Route key={route.path} path={route.path} element={element} />;
        })}

        {/* Catch-all route for undefined paths */}
        <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
      </Routes>
    </Suspense>
  );
}
