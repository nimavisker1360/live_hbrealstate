import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050505]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-white/58 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <p className="font-semibold uppercase tracking-[0.22em] text-[#d6b15f]">
            HB Real Estate
          </p>
          <p className="mt-3 max-w-md leading-6">
            Live digital showings for premium property launches, private
            viewings, and high-intent buyer discovery.
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Platform</p>
          <div className="mt-3 grid gap-2">
            <Link className="hover:text-white" href="/live">
              Live tours
            </Link>
          </div>
        </div>
        <div>
          <p className="font-semibold text-white">Status</p>
          <p className="mt-3 leading-6">
            Viewer access is routed through the HB Real Estate website, with
            admin and agent areas kept behind role-based access.
          </p>
        </div>
      </div>
    </footer>
  );
}
