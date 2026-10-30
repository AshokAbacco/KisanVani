import { formatDateTime, toNumber, modeLabel } from '../../utils/format';
import { useI18n } from '../../i18n';

const n2 = (v) => toNumber(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyText = (kg) => {
  const v = toNumber(kg);
  return v < 1 ? `${Math.round(v * 1000)}g` : `${v.toLocaleString('en-IN', { maximumFractionDigits: 3 })}kg`;
};

/**
 * 80 mm thermal cash memo (≈42 characters per line in a 12 px monospace font).
 * Uses plain text and borders only so it prints cleanly on ESC/POS printers through the browser driver.
 */
const ThermalReceipt = ({ invoice }) => {
  const { t } = useI18n();
  const shop = invoice.shop?.shopProfile;
  const addr = shop?.address;
  return (
    <div className="receipt mx-auto bg-white p-3 shadow-lift">
      <div className="text-center">
        <p className="text-[15px] font-bold uppercase">{shop?.shopName || invoice.shop?.name}</p>
        {addr && <p>{[addr.line1, addr.city || addr.village, addr.pincode].filter(Boolean).join(', ')}</p>}
        <p>{t('receipt.phone', '', { phone: invoice.shop?.mobile })}</p>
        {shop?.gstin && <p>GSTIN: {shop.gstin}</p>}
        <p className="mt-1 font-bold">
          {t('receipt.cashMemo')}
          {invoice.isDuplicateCopy ? ` (${t('receipt.duplicate')})` : ''}
        </p>
        {invoice.status === 'CANCELLED' && <p className="font-bold">*** {t('receipt.cancelled')} ***</p>}
      </div>
      <div className="my-1.5 border-t border-dashed border-black" />
      <p>{t('receipt.bill', '', { number: invoice.invoiceNumber })}</p>
      <p>{t('receipt.date', '', { date: formatDateTime(invoice.createdAt) })}</p>
      {invoice.customerName && <p>{t('receipt.customer', '', { name: invoice.customerName })}</p>}
      {invoice.customerMobile && <p>{t('receipt.mobile', '', { mobile: invoice.customerMobile })}</p>}
      <div className="my-1.5 border-t border-dashed border-black" />
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left font-bold">{t('receipt.item')}</th>
            <th className="text-right font-bold">{t('receipt.qty')}</th>
            <th className="text-right font-bold">{t('receipt.rate')}</th>
            <th className="text-right font-bold">{t('receipt.amt')}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((i) => (
            <tr key={i.id} className="align-top">
              <td className="pr-1">{i.productName}</td>
              <td className="text-right">{qtyText(i.quantityKg)}</td>
              <td className="text-right">{n2(i.unitPrice)}</td>
              <td className="text-right">{n2(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="my-1.5 border-t border-dashed border-black" />
      <div className="space-y-0.5">
        <p className="flex justify-between">
          <span>{t('receipt.items', '', { n: invoice.items.length })}</span>
          <span>{t('receipt.subtotal', '', { amount: n2(invoice.subtotal) })}</span>
        </p>
        {toNumber(invoice.discount) > 0 && (
          <p className="flex justify-between">
            <span>{t('pos.discount')}</span>
            <span>-{n2(invoice.discount)}</span>
          </p>
        )}
        <p className="flex justify-between text-[15px] font-bold">
          <span>{t('receipt.total')}</span>
          <span>{n2(invoice.total)}</span>
        </p>
        <p className="flex justify-between">
          <span>{t('receipt.paid', '', { mode: invoice.paymentMode === 'CREDIT' ? t('receipt.part') : modeLabel(invoice.paymentMode) })}</span>
          <span>{n2(invoice.amountPaid)}</span>
        </p>
        {toNumber(invoice.creditAmount) > 0 && (
          <p className="flex justify-between font-bold">
            <span>{t('receipt.onCredit')}</span>
            <span>{n2(invoice.creditAmount)}</span>
          </p>
        )}
      </div>
      <div className="my-1.5 border-t border-dashed border-black" />
      <p className="text-center">{shop?.receiptFooter || t('receipt.thanks')}</p>
      {shop?.upiId && <p className="text-center">UPI: {shop.upiId}</p>}
      <p className="mt-1 text-center text-[10px]">{t('receipt.poweredBy')}</p>
    </div>
  );
};

export default ThermalReceipt;
