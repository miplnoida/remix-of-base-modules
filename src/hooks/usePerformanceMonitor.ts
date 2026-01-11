/**
 * usePerformanceMonitor - Hook to track and log performance metrics
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSystemLogger } from './useSystemLogger';

interface PerformanceMetrics {
  pageLoadTime?: number;
  domContentLoaded?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
}

export function usePerformanceMonitor(moduleName?: string) {
  const { logPerformance } = useSystemLogger();
  const hasLoggedPageLoad = useRef(false);

  // Log page load metrics once
  useEffect(() => {
    if (hasLoggedPageLoad.current) return;
    
    const logPageMetrics = () => {
      try {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        if (!navigation) return;

        const metrics: PerformanceMetrics = {
          pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        };

        // Get paint metrics
        paint.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
          }
        });

        // Log performance metrics
        if (metrics.pageLoadTime > 0) {
          hasLoggedPageLoad.current = true;
          logPerformance({
            api_name: 'page-load',
            module: moduleName || 'Application',
            execution_time_ms: Math.round(metrics.pageLoadTime),
            status: metrics.pageLoadTime < 3000 ? 'good' : metrics.pageLoadTime < 5000 ? 'needs-improvement' : 'poor',
            severity: metrics.pageLoadTime < 3000 ? 'info' : 'warning',
            payload_json: metrics,
          });
        }
      } catch (error) {
        console.error('Failed to log performance metrics:', error);
      }
    };

    // Wait for page to fully load
    if (document.readyState === 'complete') {
      setTimeout(logPageMetrics, 100);
    } else {
      window.addEventListener('load', () => setTimeout(logPageMetrics, 100));
    }
  }, [logPerformance, moduleName]);

  // Measure custom operation timing
  const measureOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>,
    options?: { entityType?: string; entityId?: string }
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const executionTime = Math.round(performance.now() - startTime);

      logPerformance({
        api_name: operationName,
        module: moduleName,
        entity_type: options?.entityType,
        entity_id: options?.entityId,
        execution_time_ms: executionTime,
        status: 'success',
        severity: executionTime > 5000 ? 'warning' : 'info',
      });

      return result;
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);

      logPerformance({
        api_name: operationName,
        module: moduleName,
        entity_type: options?.entityType,
        entity_id: options?.entityId,
        execution_time_ms: executionTime,
        status: 'failed',
        severity: 'error',
      });

      throw error;
    }
  }, [logPerformance, moduleName]);

  // Track component render time
  const trackRenderTime = useCallback((componentName: string, renderTime: number) => {
    if (renderTime > 100) { // Only log slow renders
      logPerformance({
        api_name: `render-${componentName}`,
        module: moduleName,
        execution_time_ms: Math.round(renderTime),
        status: renderTime > 500 ? 'slow' : 'acceptable',
        severity: renderTime > 500 ? 'warning' : 'info',
      });
    }
  }, [logPerformance, moduleName]);

  return {
    measureOperation,
    trackRenderTime,
  };
}
