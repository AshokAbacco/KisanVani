import ContentPage, { Prose } from '../ContentPage';

const TermsPage = () => (
  <ContentPage title="Terms and conditions" intro="The rules for using KisanVani. Last updated October 2026.">
    <Prose>
      <h2>Accounts</h2>
      <p>You must give accurate details and keep your password private. Each account has one role. Market Mandi Owner and Driver accounts are activated after review. We may suspend accounts that misuse the platform, with the reason recorded.</p>
      <h2>Listings and orders</h2>
      <ul>
        <li>Sellers are responsible for the accuracy of quantity, grade and price in their listings and lots.</li>
        <li>An order reserves quantity once placed. Sellers accept or reject it; rejections and cancellations require a reason.</li>
        <li>Settlement amounts are based on the quantity the buyer confirms as received.</li>
      </ul>
      <h2>Payments</h2>
      <p>KisanVani records payments made between users by cash, UPI or bank transfer. It does not hold or transfer money. Disputes about payments are between the parties; the order, trip and payment history is available to both.</p>
      <h2>Transport</h2>
      <p>Drivers must hold a valid licence and keep vehicle documents current. Vehicles are used for trips only after verification. Loaded and delivered weights recorded by the driver form part of the order record.</p>
      <h2>Acceptable use</h2>
      <p>Do not post false listings, attempt to access other users’ data, interfere with the service, or use it for unlawful trade.</p>
      <h2>Liability</h2>
      <p>KisanVani is provided to help parties record and coordinate trade. The quality of produce, the conduct of trips and the settlement of payments remain the responsibility of the parties involved.</p>
    </Prose>
  </ContentPage>
);

export default TermsPage;
