import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import { I18nProvider } from './i18n';
import ErrorBoundary from './components/feedback/ErrorBoundary';
import AppRouter from './routes/AppRouter';

const App = () => (
  <ErrorBoundary>
    <I18nProvider>
      <ToastProvider>
        <SettingsProvider>
          <BrowserRouter>
            <AuthProvider>
              <AppRouter />
            </AuthProvider>
          </BrowserRouter>
        </SettingsProvider>
      </ToastProvider>
    </I18nProvider>
  </ErrorBoundary>
);

export default App;
