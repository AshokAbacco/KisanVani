import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { roleBase } from '../../constants/roles';

const NotFoundPage = () => {
  const { user } = useAuth();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center px-5 py-20">
      <p className="num font-display text-7xl font-bold text-field-200">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold">This page isn’t on the map</h1>
      <p className="mt-3 text-soil-600">The link may be old, or the page may belong to a different role. Head back and try again.</p>
      <div className="mt-8 flex gap-3">
        <Button to={user ? roleBase(user.role) : '/'}>{user ? 'Back to my dashboard' : 'Back to home'}</Button>
        <Button to="/contact" variant="secondary">
          Contact support
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
