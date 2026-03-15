export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-screen overflow-auto bg-stone-50">{children}</div>;
}
