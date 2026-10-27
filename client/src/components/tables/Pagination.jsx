import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '../../utils/format';

const Pagination = ({ meta, page, onPage }) => {
  if (!meta || meta.total === 0) return null;
  const from = (page - 1) * meta.limit + 1;
  const to = Math.min(page * meta.limit, meta.total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-soil-200 px-4 py-3 text-sm text-soil-500">
      <span className="num">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(meta.total)}
      </span>
      <div className="flex items-center gap-1">
        <button className="rounded-md p-1.5 hover:bg-soil-100 disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="num px-2">
          Page {page} of {meta.totalPages}
        </span>
        <button className="rounded-md p-1.5 hover:bg-soil-100 disabled:opacity-40" disabled={page >= meta.totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
