import { redirect } from "next/navigation";
import { DemoControls } from "@/components/demo/demo-controls";
import { SideNav } from "@/components/layout/side-nav";
import { TopNav } from "@/components/layout/top-nav";
import { getSession } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const mockMode = process.env.GATEWAY_MODE !== "real";

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav email={session.email} />
      <div className="flex flex-1">
        <SideNav />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      {mockMode ? <DemoControls /> : null}
    </div>
  );
}
