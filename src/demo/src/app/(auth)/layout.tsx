export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          ArbitrageIQ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Retail arbitrage discovery, margin analysis, and deal execution
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
