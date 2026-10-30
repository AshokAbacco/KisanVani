import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { translate } from '../../i18n';

/** Catches render errors so one broken widget never blanks the whole app. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center" role="alert">
        <AlertTriangle className="mb-3 h-8 w-8 text-chilli-500" aria-hidden />
        <h2 className="text-xl font-semibold">{translate('components.errorBoundary.title', 'This screen hit a problem')}</h2>
        <p className="mt-1 max-w-md text-soil-500">{translate('components.errorBoundary.body', 'Reload the page to try again. If it keeps happening, tell support what you were doing.')}</p>
        <button className="mt-4 rounded-lg border border-soil-300 bg-white px-4 py-2 font-semibold" onClick={() => window.location.reload()}>
          {translate('components.errorBoundary.reload', 'Reload page')}
        </button>
      </div>
    );
  }
}
