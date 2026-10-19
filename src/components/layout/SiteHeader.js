import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="NeuroSage home">
        <Image src="/images/neurosage-logo.svg" alt="" width={44} height={44} priority />
        <span><strong>NeuroSage</strong><small>Be kind to your Mind.</small></span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#about">Our approach</Link>
        <Link href="/privacy">Privacy</Link>
        <Link className="header-cta" href="/register">Begin registration <span aria-hidden="true">↗</span></Link>
      </nav>
    </header>
  );
}