import Navbar from "@/app/components/layout/Navbar"
import Footer from "@/app/components/layout/Footer"
import LoaderScreen from "@/app/components/ui/LoaderScreen"
import ScrollProgress from "@/app/components/ui/ScrollProgress"
import SupportFabInit from "@/app/components/ui/SupportFabInit"
import PageTransition from "@/app/components/ui/PageTransition"
import RealtimeWatcher from "@/app/components/ui/RealtimeWatcher"

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <RealtimeWatcher module="companyprofile" />
      <LoaderScreen />
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
