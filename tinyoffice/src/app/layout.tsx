import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { getAgents, getTeams } from "@/lib/api";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TinyClaw",
  description: "Multi-agent orchestration dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [agents, teams] = await Promise.all([
    getAgents().catch(() => ({} as Record<string, { name: string; provider: string; model: string }>)),
    getTeams().catch(() => ({} as Record<string, { name: string; agents: string[] }>)),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar agents={agents} teams={teams} />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
