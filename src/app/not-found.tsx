import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-96px)] items-center bg-[#050505] px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#d6b15f]">
          404
        </p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">
          Page not found
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-white/62">
          The page you requested is not available.
        </p>
        <Link
          className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-[#d6b15f] px-5 text-sm font-semibold text-black transition hover:bg-[#f0cf79]"
          href="/reels"
        >
          View property reels
        </Link>
      </div>
    </main>
  );
}
