/**
 * POS bill state as a pure reducer. Amounts here are only a preview — the server recalculates
 * prices from the stock master when the bill is saved.
 */

export const initialBill = { lines: [], discount: '', customerName: '', customerMobile: '', paymentMode: 'CASH', amountPaid: '', paymentReference: '' };

/** Integer paise arithmetic avoids floating-point drift in the on-screen preview. */
const paise = (rupees) => Math.round(Number(rupees || 0) * 100);
const grams = (kg) => Math.round(Number(kg || 0) * 1000);

export const lineTotalPaise = (line) => Math.round((grams(line.quantityKg) * paise(line.unitPrice)) / 1000);

export const billTotals = (bill) => {
  const subtotal = bill.lines.reduce((a, l) => a + lineTotalPaise(l), 0);
  const discount = Math.min(paise(bill.discount), subtotal);
  return { subtotal: subtotal / 100, discount: discount / 100, total: (subtotal - discount) / 100, items: bill.lines.length };
};

export function posReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { item, quantityKg } = action;
      const existing = state.lines.find((l) => l.inventoryItemId === item.id);
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((l) => (l.inventoryItemId === item.id ? { ...l, quantityKg: +(Number(l.quantityKg) + Number(quantityKg)).toFixed(3) } : l)),
        };
      }
      return {
        ...state,
        lines: [
          ...state.lines,
          {
            inventoryItemId: item.id,
            name: item.product.name,
            emoji: item.product.emoji,
            unitPrice: Number(item.sellingPricePerKg),
            available: Number(item.quantityKg),
            quantityKg: Number(quantityKg),
          },
        ],
      };
    }
    case 'setQty':
      return { ...state, lines: state.lines.map((l) => (l.inventoryItemId === action.id ? { ...l, quantityKg: action.quantityKg } : l)) };
    case 'remove':
      return { ...state, lines: state.lines.filter((l) => l.inventoryItemId !== action.id) };
    case 'field':
      return { ...state, [action.field]: action.value };
    case 'reset':
      return { ...initialBill };
    default:
      return state;
  }
}
