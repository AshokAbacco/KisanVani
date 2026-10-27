import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ThermalReceipt from './ThermalReceipt';
import { billingApi } from '../../services';
import { PageLoader } from '../../components/common/Spinner';
import ErrorState from '../../components/feedback/ErrorState';

/**
 * Print view for a bill. Each visit records one print on the server (reprints are counted and audited);
 * the ref guard stops React's development double-mount from counting twice.
 */
const InvoicePrintPage = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);
  const requested = useRef(null);

  useEffect(() => {
    if (requested.current === id) return;
    requested.current = id;
    billingApi
      .print(id)
      .then((inv) => {
        setInvoice(inv);
        if (params.get('auto') === '1') setTimeout(() => window.print(), 300);
      })
      .catch(setError);
  }, [id, params]);

  if (error) return <ErrorState error={error} />;
  if (!invoice) return <PageLoader label="Preparing the bill…" />;
  return <ThermalReceipt invoice={invoice} />;
};

export default InvoicePrintPage;
