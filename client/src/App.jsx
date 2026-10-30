import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import { I18nProvider } from './i18n';
import LanguageSync from './i18n/LanguageSync';
import ErrorBoundary from './components/feedback/ErrorBoundary';
import AppRouter from './routes/AppRouter';

const App = () => (
  <ErrorBoundary>
    <I18nProvider>
      <ToastProvider>
        <SettingsProvider>
          <BrowserRouter>
            <AuthProvider>
              {/* One language for website + dashboards, kept in step with the user's profile */}
              <LanguageSync />
              <AppRouter />
            </AuthProvider>
          </BrowserRouter>
        </SettingsProvider>
      </ToastProvider>
    </I18nProvider>
  </ErrorBoundary>
);

export default App;
