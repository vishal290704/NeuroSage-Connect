
import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#DCE9E3]/80 bg-gradient-to-r from-[#E5F3ED] via-[#F1F7F2] to-[#FCFBF8]">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">

        {/* Brand */}
        <Link
          href="/"
          aria-label="NeuroSage Connect home"
          className="group flex shrink-0 items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D6E8E0] bg-white/70 shadow-sm transition-all duration-300 group-hover:bg-white">
            <Image
              src="/images/neurosage-logo.svg"
              alt=""
              width={38}
              height={38}
              priority
              className="object-contain"
            />
          </div>

          <span className="flex flex-col gap-0.5">
            <span className="whitespace-nowrap font-serif text-[20px] font-semibold leading-tight tracking-[-0.7px] sm:text-[22px]">
              <span className="bg-gradient-to-r from-[#315F58] via-[#478578] to-[#6D9E8D] bg-clip-text text-transparent">
                NeuroSage
              </span>
              <span className="ml-1.5 font-medium italic text-[#527D70]">
                Connect
              </span>
            </span>

            <span className="text-[10px] font-medium tracking-[1.1px] text-[#75877F] sm:text-[11px]">
              Be kind to your mind.
            </span>
          </span>
        </Link>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-1 sm:gap-4"
        >
          <Link
            href="/#about"
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-[#5F756D] transition-colors duration-200 hover:text-[#398579] sm:px-3 sm:text-sm"
          >
            Our approach
          </Link>

          <Link
            href="/privacy"
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-[#5F756D] transition-colors duration-200 hover:text-[#398579] sm:px-3 sm:text-sm"
          >
            Privacy
          </Link>

          {/* Registration Button */}
          <Link
            href="/register"
            className="ml-1 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#CBE2D7] bg-[#E5F2E9]/90 px-3.5 text-xs font-semibold text-[#416F60] shadow-sm transition-all duration-200 hover:border-[#B5D8C8] hover:bg-[#D9EDE1] hover:shadow-md active:scale-[0.98] sm:ml-2 sm:h-11 sm:px-5 sm:text-sm"
          >
            Begin registration
            <span aria-hidden="true" className="text-base">
              ↗
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
