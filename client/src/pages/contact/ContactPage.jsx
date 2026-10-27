// src/pages/contact/ContactPage.jsx
import { useState } from 'react';
import { Phone, Mail, Clock, Send, CheckCircle2, ChevronDown } from 'lucide-react';
import { ROLES } from '../../constants/roles';

const CONTAINER =
  'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[1440px] 2xl:px-10';

const SUPPORT_PHONE = '+91 80000 00000';
const SUPPORT_EMAIL = 'support@kisanvani.local';

const CONTACT_CARDS = [
  {
    icon: Phone,
    title: 'Phone and WhatsApp',
    lines: [SUPPORT_PHONE],
    href: `tel:${SUPPORT_PHONE.replace(/\s/g, '')}`,
  },
  {
    icon: Mail,
    title: 'E-mail',
    lines: [SUPPORT_EMAIL],
    href: `mailto:${SUPPORT_EMAIL}`,
  },
  {
    icon: Clock,
    title: 'Hours',
    lines: ['Monday to Saturday, 6 am – 8 pm IST.', 'Mandi hours start early, so do we.'],
  },
];

const ROLE_OPTIONS = ['FARMER', 'SHOPKEEPER', 'MANDI_OWNER', 'DRIVER'];

const TOPICS = [
  'Billing and POS',
  'Orders and listings',
  'Transport and tracking',
  'Payments and settlements',
  'Account and sign-in',
  'Something else',
];

const EMPTY = { name: '', mobile: '', role: 'FARMER', topic: TOPICS[0], message: '' };

const inputBase =
  'w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-soil shadow-sm outline-none transition placeholder:text-soil-400 focus:border-green-600 focus:ring-4 focus:ring-green-600/15';

const Field = ({ label, required, error, htmlFor, children }) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-soil">
      {label}
      {required && <span className="ml-0.5 text-red-600">*</span>}
    </label>
    {children}
    {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
  </div>
);

const ContactPage = () => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (!form.name.trim()) er.name = 'Please enter your name.';
    const digits = form.mobile.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(digits)) er.mobile = 'Enter a valid 10-digit mobile number.';
    if (form.message.trim().length < 10) er.message = 'Tell us a little more (at least 10 characters).';
    return er;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;

    setSending(true);
    try {
      // TODO: send to your support API, e.g.
      // await api.post('/support/messages', form);
      await new Promise((r) => setTimeout(r, 600));
      setSent(true);
      setForm(EMPTY);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-[#f3faef] bg-cover bg-no-repeat bg-[position:center_top]"
      style={{ backgroundImage: "url('/Home/contact.png')" }}
    >
      <div className={`${CONTAINER} relative pb-28 pt-12 sm:pb-36 sm:pt-16 lg:pt-20`}>
        {/* ───────── Heading ───────── */}
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl font-bold tracking-[-0.02em] text-soil sm:text-5xl lg:text-[60px] lg:leading-[1.05]">
            Contact Us
          </h1>
          <p className="mt-5 text-base leading-relaxed text-soil-600 sm:text-lg">
            Questions about setting up your shop, mandi or farm — or something not
            working as expected? Reach the support team directly.
          </p>
          <span className="mt-6 block h-1 w-20 rounded-full bg-green-700" aria-hidden />
        </header>

        {/* ───────── Content ───────── */}
        <div className="mt-10 grid items-start gap-6 sm:mt-14 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-12">
          {/* Contact details */}
          <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 lg:gap-5">
            {CONTACT_CARDS.map(({ icon: Icon, title, lines, href }) => {
              const Wrapper = href ? 'a' : 'div';
              return (
                <li key={title}>
                  <Wrapper
                    {...(href ? { href } : {})}
                    className="group flex h-full items-start gap-4 rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-green-100 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-green-900/10 hover:ring-green-300 sm:p-6"
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700 shadow-sm ring-1 ring-green-100 transition duration-300 group-hover:bg-green-700 group-hover:text-white">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <div className="min-w-0 pt-1">
                      <p className="font-semibold text-soil">{title}</p>
                      {lines.map((l) => (
                        <p key={l} className="mt-1 break-words text-[15px] leading-relaxed text-soil-600">
                          {l}
                        </p>
                      ))}
                    </div>
                  </Wrapper>
                </li>
              );
            })}
          </ul>

          {/* Form */}
          <section className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-green-900/5 ring-1 ring-green-100 backdrop-blur-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700 ring-1 ring-green-100">
                <Mail className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="font-display text-2xl font-semibold text-soil">Send us a message</h2>
            </div>

            {sent ? (
              <div className="mt-8 flex flex-col items-center rounded-2xl bg-green-50 px-6 py-10 text-center ring-1 ring-green-200">
                <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden />
                <p className="mt-4 font-display text-xl font-semibold text-soil">Message sent</p>
                <p className="mt-2 max-w-sm text-soil-600">
                  Thanks for writing in. Our support team will call or WhatsApp you
                  on the number you gave.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-6 text-sm font-semibold text-green-700 underline underline-offset-4 hover:text-green-800"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="Your name" required htmlFor="c-name" error={errors.name}>
                  <input
                    id="c-name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={set('name')}
                    className={`${inputBase} ${errors.name ? 'border-red-400' : 'border-soil-200'}`}
                  />
                </Field>

                <Field label="Mobile number" required htmlFor="c-mobile" error={errors.mobile}>
                  <input
                    id="c-mobile"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={form.mobile}
                    onChange={set('mobile')}
                    className={`${inputBase} ${errors.mobile ? 'border-red-400' : 'border-soil-200'}`}
                  />
                </Field>

                <Field label="I am a" htmlFor="c-role">
                  <div className="relative">
                    <select
                      id="c-role"
                      value={form.role}
                      onChange={set('role')}
                      className={`${inputBase} appearance-none border-soil-200 pr-10`}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {ROLES[r]?.label ?? r}
                        </option>
                      ))}
                      <option value="OTHER">Other</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-soil-500" aria-hidden />
                  </div>
                </Field>

                <Field label="Topic" htmlFor="c-topic">
                  <div className="relative">
                    <select
                      id="c-topic"
                      value={form.topic}
                      onChange={set('topic')}
                      className={`${inputBase} appearance-none border-soil-200 pr-10`}
                    >
                      {TOPICS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-soil-500" aria-hidden />
                  </div>
                </Field>

                <div className="sm:col-span-2">
                  <Field label="How can we help?" required htmlFor="c-message" error={errors.message}>
                    <textarea
                      id="c-message"
                      rows={5}
                      placeholder="Tell us about your query..."
                      value={form.message}
                      onChange={set('message')}
                      className={`${inputBase} resize-y ${errors.message ? 'border-red-400' : 'border-soil-200'}`}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={sending}
                    className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-green-700 px-7 py-3.5 font-semibold text-white shadow-lg shadow-green-700/25 transition hover:bg-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                  >
                    <Send className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                    {sending ? 'Sending…' : 'Write to support'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;