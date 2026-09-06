import React from 'react';

/**
 * Catches render-time exceptions anywhere below it and shows a recoverable
 * screen instead of blanking the app.
 *
 * Must be a class component — React has no hook equivalent of
 * componentDidCatch / getDerivedStateFromError.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Keep the detail in the console for debugging; swap for a reporting
        // service (Sentry et al) when one is wired up.
        console.error('Uncaught render error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        const isDev = process.env.NODE_ENV === 'development';

        return (
            <div className='editorial-shell flex min-h-[70vh] flex-col items-center justify-center py-24 text-center'>
                <p className='eyebrow'>Something went wrong</p>
                <h1 className='heading-display mt-4 text-display'>
                    This page hit a snag
                </h1>
                <p className='mt-5 max-w-md font-sans text-ink-soft'>
                    Sorry — something broke while rendering. You can try again, or
                    head back to the homepage.
                </p>

                {isDev && this.state.error && (
                    <pre className='mt-8 max-w-2xl overflow-auto border border-line bg-surface p-4 text-left font-mono text-xs text-danger'>
                        {this.state.error.toString()}
                    </pre>
                )}

                <div className='mt-10 flex flex-wrap items-center justify-center gap-4'>
                    <button onClick={this.handleReset} className='btn-solid'>
                        Try Again
                    </button>
                    <a href='/' className='btn-outline'>
                        Return Home
                    </a>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
