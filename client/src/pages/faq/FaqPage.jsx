import ContentPage from '../ContentPage';

const FAQS = [
  ['Who can use KisanVani?', 'Farmers, shopkeepers, Market Mandi Owners and drivers each register for their own role. Admins manage the platform. One account belongs to one role.'],
  ['Why does my Market Mandi or Driver account need approval?', 'These accounts handle other people’s goods and money, so an admin checks the details before activating them. Farmers and shopkeepers can start immediately.'],
  ['Do I need a weighing scale connected to the computer?', 'No. Weights can be typed or chosen with quick buttons. If your scale has a USB/serial output, the shop can switch on scale reading in Chrome or Edge from the billing screen.'],
  ['Can two shops buy the same harvest at the same time?', 'No. When an order is placed the quantity is reserved in the same database step that checks it, so the second buyer is told only the remaining quantity is available.'],
  ['What if fewer kilos arrive than were ordered?', 'The driver records loaded and delivered weights, and the buyer confirms the received weight. Stock and the seller’s settlement use the received weight.'],
  ['Who can see where a driver is?', 'Only the buyer and seller of that order, whoever requested or assigned the transport, and admins — and only while the trip is active. Tracking stops when the trip ends.'],
  ['What happens if the driver loses mobile signal?', 'The map shows the last known position with the time it was received and marks it as offline. KisanVani never guesses a position.'],
  ['How are commissions shown?', 'When a Market Mandi buys from a farmer, the mandi’s commission percentage is shown separately on the settlement as gross, commission and net amounts.'],
  ['Can I print a bill on a thermal printer?', 'Yes. Bills are laid out for 80 mm rolls. Set the thermal printer as the browser’s printer with zero margins.'],
  ['Is my password stored safely?', 'Passwords are stored only as bcrypt hashes. Sessions use short-lived tokens with a refresh token kept in a secure, http-only cookie.'],
];

const FaqPage = () => (
  <ContentPage title="Frequently asked questions" intro="Short answers to what people ask most. For anything else, use the contact page.">
    <div className="divide-y divide-soil-200 border-y border-soil-200">
      {FAQS.map(([q, a]) => (
        <details key={q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-display text-lg font-semibold">
            {q}
            <span className="mt-1 text-2xl leading-none text-field-600 transition group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <p className="mt-3 leading-relaxed text-soil-600">{a}</p>
        </details>
      ))}
    </div>
  </ContentPage>
);

export default FaqPage;
