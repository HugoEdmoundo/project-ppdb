import { useNavigate } from 'react-router-dom'
import { DocTrigger } from '@repo/ui'
import { Button } from '@/components/ui'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface ApplicantPageHeaderProps {
  title: string
  description?: string
  docKey?: string
  action?: ReactNode
}

export default function ApplicantPageHeader({
  title,
  description,
  docKey,
  action,
}: ApplicantPageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="relative flex flex-col gap-4 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="absolute bottom-4 left-0 top-4 hidden w-1 rounded-full bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-700 md:block" />
        <div className="md:pl-3 space-y-2.5 min-w-0">
          <div className="flex items-center justify-between gap-2.5 md:justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/applicant')}
              className="group gap-2 h-9 px-2.5 sm:px-3.5 rounded-xl border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-semibold shadow-2xs transition-all hover:-translate-x-0.5 cursor-pointer bg-white text-xs sm:text-sm shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-700 group-hover:-translate-x-0.5 transition-transform shrink-0" />
              <span>Kembali<span className="hidden xs:inline"> ke Dashboard</span></span>
            </Button>

            {/* Tombol BookOpen di baris atas untuk tampilan mobile */}
            {docKey && (
              <div className="md:hidden shrink-0">
                <DocTrigger
                  docKey={docKey}
                  variant="light"
                  className="border border-slate-200 bg-white text-slate-600 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer h-9 w-9"
                />
              </div>
            )}
          </div>
          <div>
            <h1 className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-slate-900 break-words">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Action bar kanan untuk desktop dan mobile action */}
        <div className="flex shrink-0 items-center gap-2 flex-wrap pt-1 md:pt-0 w-full md:w-auto justify-start md:justify-end">
          {docKey && (
            <div className="hidden md:block">
              <DocTrigger
                docKey={docKey}
                variant="light"
                className="border border-slate-200 bg-white text-slate-600 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
              />
            </div>
          )}
          {action}
        </div>
      </div>
    </div>
  )
}
