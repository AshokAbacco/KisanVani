import ContentPage from '../ContentPage';
import Button from '../../components/common/Button';

const PRINCIPLES = [
  ['The farmer sees the price first', 'Listings show the farmer’s own rate per kilo. Commission, where a Market Mandi charges it, is shown on the settlement — never hidden in the price.'],
  ['Weights are the source of truth', 'Ordered, loaded, delivered and received quantities are recorded separately, so a shortfall can be traced to the step where it happened.'],
  ['Nothing moves without a record', 'Every change to stock, an order, a trip or a payment leaves a record, so every party sees the same history.'],
  ['Locations are shared only with the people on the trip', 'A driver’s position is visible to the buyer, seller and requester of that load — and only while the trip is active.'],
];

const AboutPage = () => (
  <ContentPage
    title="About KisanVani"
    intro="Vani means voice. KisanVani started from a simple observation at a Bengaluru vegetable market: the farmer, the commission agent, the shopkeeper and the tempo driver were all keeping separate notebooks about the same crate of tomatoes."
    wide
  >
    <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5 text-[17px] leading-relaxed text-soil-600">
        <p>When those notebooks disagree, the person with the least information — usually the farmer — loses. Prices are settled late, shortfalls are argued over, and nobody can say where a load is.</p>
        <p>KisanVani replaces the notebooks with one shared record. A harvest listing becomes an order, the order becomes a trip, and the trip ends in a stock entry and a settlement. Each person sees their part of it in a dashboard built for their work.</p>
        <p>We build for the realities of Indian produce trade: kilos and grams, cash and UPI, udhar accounts, APMC yards, tractors and tempos, patchy mobile data and many languages.</p>
        <Button to="/register" className="mt-2">
          Create your account
        </Button>
      </div>
      <dl className="space-y-8">
        {PRINCIPLES.map(([t, d]) => (
          <div key={t} className="border-l-4 border-field-500 pl-5">
            <dt className="font-display text-xl font-semibold">{t}</dt>
            <dd className="mt-1.5 text-soil-600">{d}</dd>
          </div>
        ))}
      </dl>
    </div>
  </ContentPage>
);

export default AboutPage;
