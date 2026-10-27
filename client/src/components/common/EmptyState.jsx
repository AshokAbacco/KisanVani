import { Inbox } from 'lucide-react';

const EmptyState = ({ icon: Icon = Inbox, title = 'Nothing here yet', description, action, compact = false }) => (
  <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-14'}`}>
    <span className="accent-soft accent-text mb-3 grid h-12 w-12 place-items-center rounded-full">
      <Icon className="h-6 w-6" aria-hidden />
    </span>
    <p className="font-display text-lg font-semibold">{title}</p>
    {description && <p className="mt-1 max-w-md text-sm text-soil-500">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
