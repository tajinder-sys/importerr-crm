import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { initializeAuth } from './store/authSlice';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRouter from './routes/AppRouter';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <ErrorBoundary
      title="Application error"
      description="The app failed to load. Please refresh the page."
    >
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
