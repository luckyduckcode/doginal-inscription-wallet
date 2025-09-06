"use strict";
/**
 * Production Error Handler and Logger
 * Doginal Inscription Wallet
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withNetworkErrorHandling = exports.withErrorHandling = exports.errorHandler = exports.ProductionErrorHandler = void 0;
class ProductionErrorHandler {
    static getInstance() {
        if (!ProductionErrorHandler.instance) {
            ProductionErrorHandler.instance = new ProductionErrorHandler();
        }
        return ProductionErrorHandler.instance;
    }
    constructor() {
        this.errorQueue = [];
        this.isReporting = false;
        this.setupGlobalErrorHandlers();
        this.setupUnhandledRejectionHandler();
    }
    setupGlobalErrorHandlers() {
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
    setupUnhandledRejectionHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Promise', event.reason?.message || event.reason, {
                promise: event.promise
            });
        });
    }
    logError(component, message, details) {
        const errorReport = {
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
    logWarning(component, message, details) {
        const warningReport = {
            timestamp: new Date().toISOString(),
            level: 'warning',
            component,
            message,
            systemInfo: details
        };
        this.errorQueue.push(warningReport);
        this.processErrorQueue();
    }
    logInfo(component, message, details) {
        const infoReport = {
            timestamp: new Date().toISOString(),
            level: 'info',
            component,
            message,
            systemInfo: details
        };
        console.log(`[${infoReport.timestamp}] ${component}: ${message}`, details);
    }
    async processErrorQueue() {
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
        }
        catch (reportingError) {
            console.error('Failed to report error:', reportingError);
        }
        finally {
            this.isReporting = false;
        }
    }
    async reportError(error) {
        try {
            // Log to main process
            if (window.electronAPI) {
                await window.electronAPI.logError(error);
            }
        }
        catch (e) {
            console.error('Error reporting failed:', e);
        }
    }
    // Wallet-specific error handlers
    handleWalletError(operation, error) {
        this.logError('Wallet', `${operation} failed: ${error.message}`, {
            operation,
            errorCode: error.code,
            details: error.details
        });
        // Show user-friendly error message
        this.showUserError('Wallet Error', `Failed to ${operation.toLowerCase()}. Please try again.`);
    }
    handleInscriptionError(operation, error) {
        this.logError('Inscription', `${operation} failed: ${error.message}`, {
            operation,
            errorCode: error.code,
            details: error.details
        });
        // Show user-friendly error message
        this.showUserError('Inscription Error', `Failed to ${operation.toLowerCase()}. Please check your balance and try again.`);
    }
    handleNetworkError(operation, error) {
        this.logError('Network', `${operation} failed: ${error.message}`, {
            operation,
            status: error.status,
            url: error.url
        });
        // Show network-specific error message
        this.showUserError('Network Error', 'Connection failed. Please check your internet connection.');
    }
    async showUserError(title, message) {
        try {
            if (window.electronAPI) {
                await window.electronAPI.showErrorDialog(title, message);
            }
            else {
                alert(`${title}: ${message}`);
            }
        }
        catch (e) {
            console.error('Failed to show error dialog:', e);
        }
    }
    // Performance monitoring
    measurePerformance(operation, startTime) {
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
    trackUserAction(action, details) {
        this.logInfo('UserAction', action, details);
    }
}
exports.ProductionErrorHandler = ProductionErrorHandler;
// Global error handler instance
exports.errorHandler = ProductionErrorHandler.getInstance();
// Utility functions for common operations
const withErrorHandling = (operation, fn) => {
    return async (...args) => {
        const startTime = Date.now();
        try {
            exports.errorHandler.trackUserAction(operation, { args });
            const result = await fn(...args);
            exports.errorHandler.measurePerformance(operation, startTime);
            return result;
        }
        catch (error) {
            exports.errorHandler.logError(operation, error.message, error);
            throw error;
        }
    };
};
exports.withErrorHandling = withErrorHandling;
const withNetworkErrorHandling = (operation, fn) => {
    return async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
                exports.errorHandler.handleNetworkError(operation, error);
            }
            else {
                exports.errorHandler.logError(operation, error.message, error);
            }
            throw error;
        }
    };
};
exports.withNetworkErrorHandling = withNetworkErrorHandling;
