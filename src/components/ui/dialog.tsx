import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

/** shadcn/ui Dialog: foco preso, Escape fecha e o foco retorna ao gatilho. */
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    closeLabel?: string
    overlayClassName?: string
    hideClose?: boolean
    /** "bare" mantém só o comportamento (foco, Escape, portal) e deixa o visual para o CSS do componente. */
    variant?: 'default' | 'bare'
  }
>(({ className, children, closeLabel = 'Fechar', overlayClassName, hideClose, variant = 'default', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={cn('fixed inset-0 z-[90] bg-[#0a0604]/75 backdrop-blur-[2px]', overlayClassName)} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        variant === 'bare'
          ? 'z-[95] focus:outline-none'
          : 'fixed left-1/2 top-1/2 z-[95] grid max-h-[calc(100vh-32px)] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-2xl border border-[#55321f] bg-[#1d100c] p-6 text-[#f5f1eb] shadow-glow focus:outline-none',
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[#cfb28c] hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d98a45]"
          aria-label={closeLabel}
        >
          <X size={18} aria-hidden="true" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('m-0 pr-8 font-mono text-lg font-bold text-[#f5f1eb]', className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('m-0 text-sm text-[#cfb28c]', className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger }
