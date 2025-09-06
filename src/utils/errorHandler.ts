/**
 * Production Error Handler and Logger
 * Doginal Inscription Wallet
 */

export interface ErrorReport {
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  component: string;
  message: string;
  stack?: string;
  userAction?: string;
  systemInfo?: any;
}

export class ProductionErrorHandler {
  private static instance: ProductionErrorHandler;
  private errorQueue: ErrorReport[] = [];
  private isReporting = false;

  static getInstance(): ProductionErrorHandler {
    if (!ProductionErrorHandler.instance) {
      ProductionErrorHandler.instance = new ProductionErrorHandler();
    }
    return ProductionErrorHandler.instance;
  }

  constructor() {
    this.setupGlobalErrorHandlers();
    this.setupUnhandledRejectionHandler();
  }

  private setupGlobalErrorHandlers() {
    // Capture all unhandled errors
    window.addEventListener('error', (event) => {
      this.logError('Global', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Capture all console errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.logError('Console', args.join(' '));
      originalConsoleError.apply(console, args);
    };
  }

  private setupUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Promise', event.reason?.message || event.reason, {
        promise: event.promise
      });
    });
  }

  logError(component: string, message: string, details?: any) {
    const errorReport: ErrorReport = {
      timestamp: new Date().toISOString(),
      level: 'error',
      component,
      message,
      stack: details?.stack || new Error().stack,
      systemInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        onLine: navigator.onLine,
        details
      }
    };

    this.errorQueue.push(errorReport);
    this.processErrorQueue();
  }

  logWarning(component: string, message: string, details?: any) {
    const warningReport: ErrorReport = {
      timestamp: new Date().toISOString(),
      level: 'warning',
      component,
      message,
      systemInfo: details
    };

    this.errorQueue.push(warningReport);
    this.processErrorQueue();
  }

  logInfo(component: string, message: string, details?: any) {
    const infoReport: ErrorReport = {
      timestamp: new Date().toISOString(),
      level: 'info',
      component,
      message,
      systemInfo: details
    };

    console.log(`[${infoReport.timestamp}] ${component}: ${message}`, details);
  }

  private async processErrorQueue() {
    if (this.isReporting || this.errorQueue.length === 0) {
      return;
    }

    this.isReporting = true;

    try {
      // Send errors to main process for logging
      while (this.errorQueue.length > 0) {
        const error = this.errorQueue.shift();
        if (error) {
          await this.reportError(error);
        }
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    } finally {
      this.isReporting = false;
    }
  }

  private async reportError(error: ErrorReport) {
    try {
      // Log to main process
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.logError(error);
      }
    } catch (e) {
      console.error('Error reporting failed:', e);
    }
  }

  // Wallet-specific error handlers
  handleWalletError(operation: string, error: any) {
    this.logError('Wallet', `${operation} failed: ${error.message}`, {
      operation,
      errorCode: error.code,
      details: error.details
    });

    // Show user-friendly error message
    this.showUserError('Wallet Error', `Failed to ${operation.toLowerCase()}. Please try again.`);
  }

  handleInscriptionError(operation: string, error: any) {
    this.logError('Inscription', `${operation} failed: ${error.message}`, {
      operation,
      errorCode: error.code,
      details: error.details
    });

    // Show user-friendly error message
    this.showUserError('Inscription Error', `Failed to ${operation.toLowerCase()}. Please check your balance and try again.`);
  }

  handleNetworkError(operation: string, error: any) {
    this.logError('Network', `${operation} failed: ${error.message}`, {
      operation,
      status: error.status,
      url: error.url
    });

    // Show network-specific error message
    this.showUserError('Network Error', 'Connection failed. Please check your internet connection.');
  }

  private async showUserError(title: string, message: string) {
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.showErrorDialog(title, message);
      } else {
        alert(`${title}: ${message}`);
      }
    } catch (e) {
      console.error('Failed to show error dialog:', e);
    }
  }

  // Performance monitoring
  measurePerformance(operation: string, startTime: number) {
    const duration = Date.now() - startTime;
    this.logInfo('Performance', `${operation} completed in ${duration}ms`, {
      operation,
      duration
    });

    // Log slow operations
    if (duration > 5000) {
      this.logWarning('Performance', `Slow operation detected: ${operation} took ${duration}ms`);
    }
  }

  // User action tracking for debugging
  trackUserAction(action: string, details?: any) {
    this.logInfo('UserAction', action, details);
  }
}

// Global error handler instance
export const errorHandler = ProductionErrorHandler.getInstance();

// Utility functions for common operations
export const withErrorHandling = (operation: string, fn: Function) => {
  return async (...args: any[]) => {
    const startTime = Date.now();
    try {
      errorHandler.trackUserAction(operation, { args });
      const result = await fn(...args);
      errorHandler.measurePerformance(operation, startTime);
      return result;
    } catch (error) {
      errorHandler.logError(operation, (error as Error).message, error);
      throw error;
    }
  };
};

export const withNetworkErrorHandling = (operation: string, fn: Function) => {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error: any) {
      if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
        errorHandler.handleNetworkError(operation, error);
      } else {
        errorHandler.logError(operation, error.message, error);
      }
      throw error;
    }
  };
};
