import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cleanse.ng — Professional House Cleaners in Ibadan",
  description:
    "Book trusted, vetted house cleaners in Ibadan. Flat per-visit pricing by bedroom, secure Paystack checkout, and reliable teams across Bodija, Akobo, Jericho, Oluyole and Iyaganku.",
};

const PRICES = [
  { br: "1 bed", amt: "₦9,000" },
  { br: "2 bed", amt: "₦13,000" },
  { br: "3 bed", amt: "₦17,000" },
  { br: "4 bed", amt: "₦20,000" },
  { br: "5 bed", amt: "₦25,000" },
];

const AREAS = ["Bodija", "Akobo", "Jericho", "Oluyole", "Iyaganku"];

const INCLUDED = [
  ["Living areas & bedrooms", "Dusting, surfaces, floors swept & mopped, tidying and general clean."],
  ["Kitchen", "Counters, stovetop, sink, exterior of appliances, floors and taking out the trash."],
  ["Bathrooms", "Toilet, sink, shower/bath, mirrors, tiles and floors scrubbed and sanitised."],
  ["Finishing touches", "Beds made, mirrors and glass wiped, and a final walk-through before we leave."],
];

const ARTICLES = [
  ["/best-cleaning-services-ibadan", "Best cleaning services in Ibadan"],
  ["/home-cleaning-cost-ibadan", "How much home cleaning costs in Ibadan"],
  ["/how-much-to-hire-a-cleaner-ibadan", "How much to hire a cleaner in Ibadan"],
  ["/how-to-find-trusted-house-cleaners-ibadan", "Finding trusted house cleaners"],
  ["/jericho-house-cleaning", "House cleaning in Jericho"],
  ["/is-cleanse-ng-worth-it", "Is Cleanse.ng worth it?"],
];

const WHATSAPP =
  "https://wa.me/2349130663739?text=" +
  encodeURIComponent("Hi Cleanse, I'd like to ask about a cleaning.");

export default function Home() {
  return (
    <>
      {/* Nav */}
      <header className="mk-nav">
        <Link className="brand" href="/">
          CLEANSE.NG
        </Link>
        <nav>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#areas">Areas</a>
          <a href="/blog">Blog</a>
          <Link className="mk-nav-cta btn-primary" href="/book">
            Book a Cleaning
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="hero-wrap">
        <div className="hero-inner">
          <div>
            <h1>Professional house cleaning in Ibadan, booked in minutes.</h1>
            <p className="lead">
              Vetted teams, flat pricing by bedroom, and secure payment. Book a clean and we handle
              the rest.
            </p>
            <div className="hero-cta-row">
              <Link className="btn-primary" href="/book">
                Book a Cleaning
              </Link>
              <a className="btn-ghost" href={WHATSAPP} target="_blank" rel="noreferrer">
                Chat with us on WhatsApp
              </a>
            </div>
            <div className="hero-areas">
              Serving Bodija · Akobo · Jericho · Oluyole · Iyaganku
            </div>
          </div>
          <div className="hero-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero_lifestyle_image.jpg" alt="A freshly cleaned Ibadan home" />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <div className="trust-strip">
        <div className="trust-item">
          <div className="t">Vetted &amp; trusted teams</div>
          <div className="d">Background-checked, trained professionals.</div>
        </div>
        <div className="trust-item">
          <div className="t">Flat, honest pricing</div>
          <div className="d">Priced by bedroom — no hidden fees.</div>
        </div>
        <div className="trust-item">
          <div className="t">Secure payment</div>
          <div className="d">Pay safely online with Paystack.</div>
        </div>
      </div>

      {/* What's included */}
      <section className="section">
        <h2>What a Regular Cleaning includes</h2>
        <p className="sub">
          A thorough, top-to-bottom clean of your home&apos;s everyday living spaces.
        </p>
        <div className="incl-grid">
          {INCLUDED.map(([h, d]) => (
            <div className="incl-card" key={h}>
              <h3>{h}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="section" id="pricing" style={{ paddingTop: 0 }}>
        <h2>Simple, flat pricing</h2>
        <p className="sub">
          One-time Regular Cleaning, priced by the number of bedrooms. Pay per visit — no
          subscription required.
        </p>
        <div className="price-grid">
          {PRICES.map((p) => (
            <div className="price-card" key={p.br}>
              <div className="br">{p.br}</div>
              <div className="amt">{p.amt}</div>
              <div className="per">per visit</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 22 }}>
          <span className="soon">Weekly &amp; monthly subscription plans coming soon</span>
        </p>
        <p style={{ textAlign: "center", marginTop: 22 }}>
          <Link className="btn-primary" href="/book">
            Book a Cleaning
          </Link>
        </p>
      </section>

      {/* How it works */}
      <section className="section" id="how" style={{ paddingTop: 0 }}>
        <h2>How it works</h2>
        <p className="sub">From booking to a spotless home in three simple steps.</p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="n">1</div>
            <h3>Book &amp; pay online</h3>
            <p>Pick your service, home size and time. See your price instantly and pay securely.</p>
          </div>
          <div className="step-card">
            <div className="n">2</div>
            <h3>We assign a vetted cleaner</h3>
            <p>Cleanse matches your booking to a trusted, available professional near you.</p>
          </div>
          <div className="step-card">
            <div className="n">3</div>
            <h3>Relax — we clean</h3>
            <p>Your cleaner arrives on schedule and leaves your home fresh. We stay in touch on WhatsApp.</p>
          </div>
        </div>
      </section>

      {/* Areas */}
      <section className="section" id="areas" style={{ paddingTop: 0 }}>
        <h2>Areas we serve in Ibadan</h2>
        <p className="sub">Reliable cleaning across these neighbourhoods, with more on the way.</p>
        <div className="area-grid">
          {AREAS.map((a) => (
            <div className="area-pill" key={a}>
              {a}
            </div>
          ))}
        </div>
      </section>

      {/* Articles / SEO */}
      <section className="section" style={{ paddingTop: 0 }}>
        <h2>Cleaning tips &amp; guides</h2>
        <p className="sub">Advice on hiring, costs and getting the most from a cleaning service.</p>
        <div className="link-list">
          {ARTICLES.map(([href, label]) => (
            <a key={href} href={href}>
              {label} →
            </a>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="cta-band">
        <h2>Ready for a cleaner home?</h2>
        <p>Book a professional cleaning in minutes.</p>
        <Link className="btn-primary" href="/book">
          Book a Cleaning
        </Link>
      </section>

      {/* Footer */}
      <footer className="mk-footer">
        <div className="inner">
          <div>
            <div className="brand">CLEANSE.NG</div>
            <p style={{ maxWidth: "32ch", fontSize: 14, marginTop: 8 }}>
              Professional, trusted house cleaning across Ibadan.
            </p>
          </div>
          <div>
            <strong style={{ color: "var(--white)", display: "block", marginBottom: 10 }}>Company</strong>
            <a href="#pricing">Pricing</a>
            <a href="#areas">Areas</a>
            <a href="/blog">Blog</a>
            <Link href="/book">Book a Cleaning</Link>
          </div>
          <div>
            <strong style={{ color: "var(--white)", display: "block", marginBottom: 10 }}>Get in touch</strong>
            <a href={WHATSAPP} target="_blank" rel="noreferrer">
              WhatsApp us
            </a>
            <a href="https://instagram.com/cleansenigeria" target="_blank" rel="noreferrer">
              @cleansenigeria
            </a>
            <Link href="/admin/login">Operator sign in</Link>
            <Link href="/cleaner/login">Cleaner sign in</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
