export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 pb-32 sm:px-8 sm:py-10 md:pb-12 lg:px-12">
      {children}
    </div>
  );
}
