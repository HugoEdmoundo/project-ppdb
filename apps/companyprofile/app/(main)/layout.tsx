import Navbar from "@/app/components/layout/Navbar"
import Footer from "@/app/components/layout/Footer"
import { HeroLoader } from "@repo/ui"
import ScrollProgress from "@/app/components/ui/ScrollProgress"
import SupportFabInit from "@/app/components/ui/SupportFabInit"
import PageTransition from "@/app/components/ui/PageTransition"
import RealtimeWatcher from "@/app/components/ui/RealtimeWatcher"
import { getSettings } from "@/app/lib/api"

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Try to fetch logoUrl on server side if possible, or just let client handle it?
  // Since it's a server component we can fetch it. But wait, `HeroLoader` can accept logoUrl.
  // Actually, wait, HeroLoader doesn't fetch internally anymore! It just takes `logoUrl`.
  const settings = await getSettings().catch(() => [])
  const logoUrl = settings.find((s) => s.key === 'logo')?.value || settings.find((s) => s.key === 'favicon')?.value || undefined

  return (
    <>
      <RealtimeWatcher module="companyprofile" />
      <HeroLoader logoUrl={logoUrl} />
      <ScrollProgress />
      <SupportFabInit />
      <Navbar />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </>
  )
}
