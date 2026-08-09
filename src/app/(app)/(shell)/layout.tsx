export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="content max-w-content flex-1 px-5 py-8 pb-24 sm:px-11 sm:py-8 md:pb-8">
      {children}
    </div>
  );
}
