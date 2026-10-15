"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  Search,
  Sparkles,
  ArrowRight,
  X,
  History,
  FileText,
  Users,
  Building,
  GraduationCap,
  Calendar,
  Shield,
  Loader2,
  Newspaper,
  BookOpen,
  Trophy,
  CornerDownLeft,
} from "lucide-react"
import { cn } from "../../../lib/utils"
import type { DashboardNavGroup, DashboardNavItem, DashboardUser } from "../types"
import {
  buildLocalSemanticIndex,
  fetchLiveSemanticResults,
  searchSemanticCatalog,
  type SemanticSearchItem,
} from "./semantic-engine"

export interface SemanticSearchProps {
  navGroups?: DashboardNavGroup[]
  user?: DashboardUser | null
  apiBase?: string
  onNavigate?: (item: DashboardNavItem) => void
  renderLink?: ComponentType<any>
  className?: string
}

const CATEGORY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Navigasi: BookOpen,
  Aksi: Sparkles,
  Pendaftar: Users,
  Pengguna: Users,
  "Konten CMS": Newspaper,
  Konten: Newspaper,
  Fasilitas: Building,
  Pengajar: GraduationCap,
  Program: BookOpen,
  Prestasi: Trophy,
  "Hak Akses": Shield,
  "Periode PPDB": Calendar,
  Lainnya: FileText,
}

const CATEGORY_COLORS: Record<string, string> = {
  Navigasi: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200/50",
  Aksi: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200/50",
  Pendaftar: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/50",
  Pengguna: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200/50",
  "Konten CMS": "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200/50",
  Konten: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200/50",
  Fasilitas: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400 border-cyan-200/50",
  Pengajar: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200/50",
  Program: "bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400 border-teal-200/50",
  Prestasi: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400 border-yellow-200/50",
  "Hak Akses": "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400 border-violet-200/50",
  "Periode PPDB": "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 border-sky-200/50",
  Lainnya: "bg-gray-50 text-gray-600 dark:bg-gray-950/50 dark:text-gray-400 border-gray-200/50",
}

const RECENT_KEY = "ptd_recent_searches"

export function SemanticSearch({
  navGroups = [],
  user: _user,
  apiBase = "",
  onNavigate,
  className,
}: SemanticSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("Semua")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [serverResults, setServerResults] = useState<SemanticSearchItem[]>([])
  const [isLoadingServer, setIsLoadingServer] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Deteksi Mac OS untuk label shortcut
  const isMac = typeof window !== "undefined" && /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent)

  // Bangun katalog navigasi & aksi lokal sekali atau saat navGroups berubah
  const localCatalog = useMemo(() => buildLocalSemanticIndex(navGroups), [navGroups])

  // Muat riwayat pencarian dari localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY)
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch {}
  }, [])

  const saveRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim()
    if (!trimmed || trimmed.length < 2) return
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  const removeRecentSearch = useCallback((e: React.MouseEvent, term: string) => {
    e.stopPropagation()
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== term)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Auto-focus input saat modal terbuka
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    } else {
      setQuery("")
      setServerResults([])
    }
  }, [open])

  // Pencarian Semantik Klien Seketika (Zero-lag)
  const localResults = useMemo(() => {
    if (!query.trim()) return []
    return searchSemanticCatalog(query, localCatalog)
  }, [query, localCatalog])

  // Debounced Query ke Backend Semantic Search (/search/semantic)
  useEffect(() => {
    const cleanQ = query.trim()
    if (cleanQ.length < 2) {
      setServerResults([])
      setIsLoadingServer(false)
      return
    }

    setIsLoadingServer(true)
    const timer = setTimeout(async () => {
      const res = await fetchLiveSemanticResults(cleanQ, apiBase)
      setServerResults(res)
      setIsLoadingServer(false)
    }, 220)

    return () => clearTimeout(timer)
  }, [query, apiBase])

  // Gabungkan hasil klien dan server, deduplikasi berdasarkan url/title
  const combinedResults = useMemo(() => {
    const seen = new Set<string>()
    const merged: SemanticSearchItem[] = []

    for (const item of [...localResults, ...serverResults]) {
      const key = `${item.title.toLowerCase()}-${item.url || item.id}`
      if (!seen.has(key)) {
        seen.add(key)
        merged.push(item)
      }
    }

    // Filter kategori jika tab spesifik dipilih
    if (selectedFilter !== "Semua") {
      return merged.filter((item) => {
        if (selectedFilter === "Navigasi") return item.category === "Navigasi"
        if (selectedFilter === "Aksi") return item.category === "Aksi"
        if (selectedFilter === "Pendaftar") return item.category === "Pendaftar"
        if (selectedFilter === "Pengguna") return item.category === "Pengguna"
        if (selectedFilter === "Konten") return ["Konten", "Konten CMS", "Fasilitas", "Pengajar", "Program", "Prestasi"].includes(item.category)
        return true
      })
    }

    return merged
  }, [localResults, serverResults, selectedFilter])

  // Reset selected index saat query atau filter berganti
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, selectedFilter])

  // Eksekusi pemilihan item
  const handleSelectItem = useCallback(
    (item: SemanticSearchItem) => {
      if (query.trim()) saveRecentSearch(query.trim())
      setOpen(false)

      if (item.onClick) {
        item.onClick()
        return
      }

      if (item.url) {
        if (onNavigate) {
          onNavigate({
            key: item.id,
            label: item.title,
            href: item.url,
          })
        } else {
          window.location.href = item.url
        }
      }
    },
    [onNavigate, query, saveRecentSearch]
  )

  // Keyboard navigation di dalam list hasil
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < combinedResults.length - 1 ? prev + 1 : 0))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, combinedResults.length - 1)))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (combinedResults[selectedIndex]) {
          handleSelectItem(combinedResults[selectedIndex])
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        setOpen(false)
      }
    },
    [combinedResults, selectedIndex, handleSelectItem]
  )

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector<HTMLElement>("[data-active='true']")
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  const filterTabs = ["Semua", "Navigasi", "Pendaftar", "Konten", "Pengguna", "Aksi"]

  return (
    <div className={cn("relative flex items-center", className)}>
      {/* Tombol Pemicu Desktop */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/60 hover:bg-muted/70 px-3 py-1.5 text-xs text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:text-foreground shadow-2xs w-44 md:w-64 lg:w-72 group focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Cari apa saja di dashboard..."
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          <Search className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0 group-hover:text-primary transition-colors" />
          <span className="truncate">Cari fitur, data, santri...</span>
        </span>
        <kbd className="inline-flex items-center gap-0.5 rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/90 select-none shrink-0 group-hover:border-primary/30">
          <span>{isMac ? "⌘" : "Ctrl"}</span>
          <span>K</span>
        </kbd>
      </button>

      {/* Tombol Pemicu Mobile */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background/60 text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors focus:outline-none"
        aria-label="Buka pencarian"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Dialog Command Palette */}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            onKeyDown={handleKeyDown}
            className="fixed left-1/2 top-[10%] sm:top-[15%] z-50 w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-border bg-background shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header Input Pencarian */}
            <div className="relative flex items-center border-b border-border px-4 py-3 bg-muted/20">
              <Search className="h-5 w-5 text-muted-foreground shrink-0 mr-3" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari santri, dokumen, pembayaran, berita, role, menu..."
                className="flex-1 bg-transparent text-sm sm:text-base outline-none placeholder:text-muted-foreground/60 text-foreground"
              />
              <div className="flex items-center gap-2 shrink-0">
                {isLoadingServer && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                {query && (
                  <button
                    onClick={() => {
                      setQuery("")
                      inputRef.current?.focus()
                    }}
                    className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                  <Sparkles className="h-3 w-3 text-emerald-600 animate-pulse" />
                  Semantik AI
                </span>
                <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
                  <span className="text-xs font-mono px-1">ESC</span>
                </DialogPrimitive.Close>
              </div>
            </div>

            {/* Kategori Filter Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-border/60 bg-muted/10 overflow-x-auto no-scrollbar">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedFilter(tab)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-all whitespace-nowrap",
                    selectedFilter === tab
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Kontainer Hasil */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[180px] max-h-[50vh]">
              {/* State A: Input Kosong -> Rekomendasi & Riwayat */}
              {!query.trim() && (
                <div className="p-2 space-y-4">
                  {/* Riwayat Terakhir */}
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-2 pb-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Pencarian Terakhir
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 px-2">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            onClick={() => {
                              setQuery(term)
                              inputRef.current?.focus()
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted px-2.5 py-1 text-xs text-foreground group transition-colors"
                          >
                            <History className="h-3 w-3 text-muted-foreground" />
                            <span>{term}</span>
                            <span
                              onClick={(e) => removeRecentSearch(e, term)}
                              className="text-muted-foreground/60 hover:text-destructive transition-colors ml-0.5"
                            >
                              <X className="h-3 w-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pintasan Rekomendasi */}
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-2 block">
                      Pintasan Populer & Fitur Utama
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 px-1">
                      {localCatalog.slice(0, 6).map((item) => {
                        const Icon = (item.icon as ComponentType<{ className?: string }>) || CATEGORY_ICONS[item.category] || BookOpen
                        const colorClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Lainnya
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/40 cursor-pointer transition-all group"
                          >
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border", colorClass)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {item.subtitle || item.category}
                              </p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* State B: Menampilkan Hasil Pencarian Semantik */}
              {query.trim() && combinedResults.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] text-muted-foreground">
                    <span>
                      Ditemukan <strong className="text-foreground">{combinedResults.length}</strong> hasil semantik
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">
                      Gunakan panah ↑↓ dan Enter
                    </span>
                  </div>

                  {combinedResults.map((item, idx) => {
                    const isSelected = idx === selectedIndex
                    const Icon = (item.icon as ComponentType<{ className?: string }>) || CATEGORY_ICONS[item.category] || CATEGORY_ICONS.Lainnya
                    const colorClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Lainnya

                    return (
                      <div
                        key={item.id}
                        data-active={isSelected}
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border",
                          isSelected
                            ? "bg-primary/10 border-primary/40 shadow-xs"
                            : "border-transparent hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border", colorClass)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border/60">
                                  {item.badge}
                                </span>
                              )}
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-muted/60 text-muted-foreground/80">
                                {item.category}
                              </span>
                            </div>
                            {item.subtitle && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.score && item.score >= 50 && (
                            <span
                              className={cn(
                                "text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md",
                                item.score >= 85
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                              )}
                            >
                              {item.score}% relevan
                            </span>
                          )}
                          <CornerDownLeft
                            className={cn(
                              "h-3.5 w-3.5 transition-opacity",
                              isSelected ? "text-primary opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* State C: Hasil Kosong */}
              {query.trim() && combinedResults.length === 0 && !isLoadingServer && (
                <div className="p-8 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                    <Search className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Tidak ada hasil untuk &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Coba cari dengan kata kunci lain seperti &ldquo;santri&rdquo;, &ldquo;dokumen&rdquo;, &ldquo;bayar&rdquo;, &ldquo;tahfidz&rdquo;, &ldquo;berita&rdquo;, atau nama pendaftar.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Pintasan Keyboard */}
            <div className="border-t border-border px-4 py-2.5 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono">↑</kbd>
                  <kbd className="rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono">↓</kbd>
                  navigasi
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono">↵</kbd>
                  pilih
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono">ESC</kbd>
                  tutup
                </span>
              </div>
              <span className="hidden sm:inline-flex text-[10px] text-muted-foreground/70">
                PTDARRAHMAN Semantic Search Engine v2.0
              </span>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
