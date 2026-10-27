import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const PageHeader = ({ title, description, actions, back }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {back && (
        <Link to={back.to} className="mb-1 inline-flex items-center gap-1 text-sm text-soil-500 hover:text-soil">
          <ChevronLeft className="h-4 w-4" aria-hidden /> {back.label}
        </Link>
      )}
      <h1 className="text-2xl font-semibold sm:text-[28px]">{title}</h1>
      {description && <p className="mt-1 max-w-2xl text-soil-500">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
