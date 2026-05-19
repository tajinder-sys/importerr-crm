import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { typography } from '../../config/designSystem';
import Button from './ui/Button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });

    if (this.props.onReset) {
      this.props.onReset();
      return;
    }

    window.location.reload();
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback, title, description } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <div className="flex max-w-md flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>

            <p className={cn(typography.body, 'font-medium text-slate-700')}>
              {title || 'Something went wrong'}
            </p>

            <p className={cn(typography.caption, 'mt-1 text-slate-500')}>
              {description || 'An unexpected error occurred. Please try again.'}
            </p>

            <Button size="sm" className="mt-4" onClick={this.handleReset}>
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
