import Image from "next/image";

export function Maintenance() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col items-center gap-7 text-center">
        <Image
          src="/logo-black.png"
          alt="Trak"
          width={96}
          height={96}
          priority
          className="h-20 w-20 object-contain dark:hidden"
        />
        <Image
          src="/logo-white.png"
          alt="Trak"
          width={96}
          height={96}
          priority
          className="hidden h-20 w-20 object-contain dark:block"
        />

        <div className="flex flex-col items-center gap-4">
          <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-foreground-secondary">
            Under maintenance
          </span>
          <h1 className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            TRAK is currently undergoing an update.
          </h1>
        </div>

        <p className="max-w-md text-base leading-relaxed text-foreground-secondary">
          We&apos;re sorry for the inconvenience. We&apos;re currently working on
          an important update to improve the application and resolve some
          issues.
        </p>

        <div className="h-px w-24 bg-primary" />

        <p className="text-sm text-foreground-muted">
          We&apos;ll be back shortly. Thank you for your patience and
          understanding.
        </p>
      </div>
    </main>
  );
}