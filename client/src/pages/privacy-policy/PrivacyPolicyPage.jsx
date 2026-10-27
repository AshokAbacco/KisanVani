import ContentPage, { Prose } from '../ContentPage';

const PrivacyPolicyPage = () => (
  <ContentPage title="Privacy policy" intro="What KisanVani collects, why, and who can see it. Last updated October 2026.">
    <Prose>
      <p>This policy describes how KisanVani handles personal information for farmers, shopkeepers, Market Mandi Owners, drivers and their customers. It is written to align with the Digital Personal Data Protection Act, 2023. Operators deploying KisanVani should review it with their own legal advisers.</p>
      <h2>Information we collect</h2>
      <ul>
        <li>Account details: name, mobile number, optional e-mail, role and preferred language.</li>
        <li>Business details: shop, farm or mandi name, licence numbers, GSTIN, addresses and optional GPS coordinates.</li>
        <li>Trade records: listings, orders, bills, stock movements, settlements and payments.</li>
        <li>Driver information: licence, vehicle registration and documents, and GPS positions during active trips.</li>
        <li>Shop customers: name and mobile number entered on bills, used for the shop’s own khata.</li>
      </ul>
      <h2>How location is used</h2>
      <p>Drivers share location only after starting it on an active trip, with the browser’s permission. Positions are visible only to the parties of that trip and to admins, and sharing stops when the trip ends.</p>
      <h2>Who can see your information</h2>
      <p>Each role sees only what it needs: buyers see the seller’s listing and contact for their orders; drivers see pickup and drop contacts for their trips. Admins can see platform records to operate and audit the service; their actions are logged.</p>
      <h2>Security</h2>
      <p>Passwords are stored as bcrypt hashes. Sessions use short-lived access tokens and an http-only refresh cookie. Uploaded files are checked by type and content.</p>
      <h2>Retention and your rights</h2>
      <p>Trade and payment records are kept as required for accounting and tax purposes. You may ask to see, correct or delete your personal information by contacting support; records that must be retained by law are kept but restricted.</p>
      <h2>Contact</h2>
      <p>For privacy questions, write to the support address on the contact page.</p>
    </Prose>
  </ContentPage>
);

export default PrivacyPolicyPage;
