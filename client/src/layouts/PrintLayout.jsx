import { Outlet, useNavigate } from 'react-router-dom';
import { ChevronLeft, Printer } from 'lucide-react';

/** Bare page for printouts (thermal cash memo). Controls are hidden when printing. */
const PrintLayout = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-soil-100 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-md items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-soil-600 hover:text-soil">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-field-700 px-4 py-2 text-sm font-semibold text-white">
          <Printer className="h-4 w-4" aria-hidden /> Print
        </button>
      </div>
      <Outlet />
    </div>
  );
};

export default PrintLayout;
