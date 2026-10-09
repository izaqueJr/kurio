import * as React from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '../../lib/utils'

/** shadcn/ui Skeleton com shimmer (desativado por `prefers-reduced-motion`). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('skeleton-block rounded-md', className)} {...props} />
}

const tones = {
  error: { icon: AlertTriangle, className: 'border-[#8a3b2a] bg-[#3a1912] text-[#ffd7cb]' },
  success: { icon: CheckCircle2, className: 'border-[#2f6b3c] bg-[#14301c] text-[#e1ffe2]' },
  info: { icon: Info, className: 'border-[#7a4a26] bg-[#2a1912] text-[#f5e3cc]' },
}

/** shadcn/ui Alert. O tom é comunicado por ícone e texto, não apenas por cor. */
export function Alert({
  tone = 'error',
  title,
  children,
  action,
  className,
  live = true,
}: {
  tone?: keyof typeof tones
  title?: string
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
  live?: boolean
}) {
  const { icon: Icon, className: toneClass } = tones[tone]
  return (
    <div
      role={live ? (tone === 'error' ? 'alert' : 'status') : undefined}
      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 font-mono text-[13px] leading-5', toneClass, className)}
    >
      <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="grid min-w-0 flex-1 gap-1">
        {title && <strong className="font-bold">{title}</strong>}
        {children && <div>{children}</div>}
        {action && <div className="mt-1 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  )
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center rounded-full border border-[#55321f] px-2 py-0.5 font-mono text-[11px] text-[#cfb28c]', className)} {...props} />
}
