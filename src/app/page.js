import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Heart,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";

const steps = [
  "Share what support you are looking for",
  "Pay the registration fee via UPI",
  "Our team manually reviews your payment",
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero-section">
          <div className="hero-text">
            <p className="eyebrow">
              <span className="eyebrow-dot" /> A NeuroSage initiative
            </p>
            <h1>
              Your well-being
              <br />
              <em>deserves attention.</em>
            </h1>
            <p className="hero-copy">
              A thoughtful first step toward understanding your well-being and
              finding the right kind of support. Share what feels comfortable.
              We’ll take it from there, together.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" href="/register">
                Begin registration <ArrowRight size={17} />
              </Link>
              <a className="text-link" href="#how-it-works">
                See how it works <ArrowDown size={16} />
              </a>
            </div>
            <div className="hero-meta">
              <span>
                <LockKeyhole size={15} /> Your information stays private
              </span>
              <span>
                <Heart size={15} /> Awareness, not diagnosis
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="A calm illustration of a growing plant"
          >
            <div className="art-sun" />
            <div className="art-ring ring-one" />
            <div className="art-ring ring-two" />
            <div className="art-leaf leaf-one" />
            <div className="art-leaf leaf-two" />
            <div className="art-leaf leaf-three" />
            <div className="art-stem" />
            <div className="art-ground" />
            <div className="art-caption">
              <span>01 / 03</span>
              <p>
                Make space for
                <br />
                your inner world.
              </p>
              <Sparkles size={17} />
            </div>
          </div>
        </section>
        <section className="intro-band" id="about">
          <div className="intro-mark">
            <Heart size={22} />
          </div>
          <div>
            <p className="eyebrow">Be kind to your Mind.</p>
            <h2>A little awareness can open a new door.</h2>
          </div>
          <p>
            NeuroSage brings people closer to mental wellness awareness and
            appropriate support. This registration helps our team understand
            your preferences before the camp.
          </p>
        </section>
        <section className="process-section" id="how-it-works">
          <div className="section-heading">
            <p className="eyebrow">A clear, considered process</p>
            <h2>Three steps. No surprises.</h2>
            <p>
              Your registration is reviewed by a person, not an automated
              assessment.
            </p>
          </div>
          <div className="process-grid">
            {steps.map((item, index) => (
              <article className="process-item" key={item}>
                <span className="process-number">0{index + 1}</span>
                <h3>{item}</h3>
                <p>
                  {index === 0
                    ? "Tell us about yourself and the support or information you would prefer."
                    : index === 1
                      ? "Use the configured UPI QR code to pay the listed camp fee."
                      : "A NeuroSage administrator checks your transaction before approval."}
                </p>
              </article>
            ))}
          </div>
          <div className="process-note">
            <CheckCircle2 size={18} />
            <span>
              You’ll receive an email only after your payment is verified and
              your registration is approved.
            </span>
          </div>
        </section>
        <section className="care-band">
          <div>
            <p className="eyebrow">A note before you begin</p>
            <h2>This is a starting point, not a diagnosis.</h2>
            <p>
              Choosing an area of concern does not mean you have a disorder.
              Only a qualified professional can conduct an assessment. This
              website is not an emergency service.
            </p>
          </div>
          <Link className="secondary-button" href="/register">
            Start your registration <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <footer className="site-footer">
        <span>NeuroSage · Be kind to your Mind.</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/admin/login">Admin</Link>
        </div>
      </footer>
    </>
  );
}
