import { formatDateTime, toNumber } from '../../utils/format';

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
  const shop = invoice.shop?.shopProfile;
  const addr = shop?.address;
  return (
    <div className="receipt mx-auto bg-white p-3 shadow-lift">
      <div className="text-center">
        <p className="text-[15px] font-bold uppercase">{shop?.shopName || invoice.shop?.name}</p>
        {addr && <p>{[addr.line1, addr.city || addr.village, addr.pincode].filter(Boolean).join(', ')}</p>}
        <p>Ph: {invoice.shop?.mobile}</p>
        {shop?.gstin && <p>GSTIN: {shop.gstin}</p>}
        <p className="mt-1 font-bold">CASH MEMO{invoice.isDuplicateCopy ? ' (DUPLICATE)' : ''}</p>
        {invoice.status === 'CANCELLED' && <p className="font-bold">*** CANCELLED ***</p>}
      </div>
      <div className="my-1.5 border-t border-dashed border-black" />
      <p>Bill: {invoice.invoiceNumber}</p>
      <p>Date: {formatDateTime(invoice.createdAt)}</p>
      {invoice.customerName && <p>Customer: {invoice.customerName}</p>}
      {invoice.customerMobile && <p>Mobile: {invoice.customerMobile}</p>}
      <div className="my-1.5 border-t border-dashed border-black" />
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left font-bold">Item</th>
            <th className="text-right font-bold">Qty</th>
            <th className="text-right font-bold">Rate</th>
            <th className="text-right font-bold">Amt</th>
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
          <span>Items: {invoice.items.length}</span>
          <span>Subtotal {n2(invoice.subtotal)}</span>
        </p>
        {toNumber(invoice.discount) > 0 && (
          <p className="flex justify-between">
            <span>Discount</span>
            <span>-{n2(invoice.discount)}</span>
          </p>
        )}
        <p className="flex justify-between text-[15px] font-bold">
          <span>TOTAL Rs.</span>
          <span>{n2(invoice.total)}</span>
        </p>
        <p className="flex justify-between">
          <span>Paid ({invoice.paymentMode === 'CREDIT' ? 'part' : invoice.paymentMode})</span>
          <span>{n2(invoice.amountPaid)}</span>
        </p>
        {toNumber(invoice.creditAmount) > 0 && (
          <p className="flex justify-between font-bold">
            <span>On credit (udhar)</span>
            <span>{n2(invoice.creditAmount)}</span>
          </p>
        )}
      </div>
      <div className="my-1.5 border-t border-dashed border-black" />
      <p className="text-center">{shop?.receiptFooter || 'Thank you! Visit again.'}</p>
      {shop?.upiId && <p className="text-center">UPI: {shop.upiId}</p>}
      <p className="mt-1 text-center text-[10px]">Powered by KisanVani</p>
    </div>
  );
};

export default ThermalReceipt;
