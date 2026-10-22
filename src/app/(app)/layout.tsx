import { auth, signOut } from "@/auth";
import { QuickCapture } from "@/components/quick-capture";
import { AppShell } from "@/components/app-shell";
import { getSidebarData } from "@/lib/sidebar-data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <>{children}</>;

  const data = await getSidebarData(userId);

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <>
      <AppShell data={data} logoutAction={logout}>
        {children}
      </AppShell>
      <QuickCapture />
    </>
  );
}
