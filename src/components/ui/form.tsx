import * as React from 'react'
import { cn } from '../../lib/utils'

/** shadcn/ui Input/Label/Field: rótulo, ajuda e erro associados ao controle por id. */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d98a45]', className)} {...props} />
))
Input.displayName = 'Input'

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn(className)} {...props} />
))
Label.displayName = 'Label'

type FieldRenderProps = {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
  'aria-required'?: true
}

export function Field({
  label,
  error,
  hint,
  required,
  className,
  labelClassName,
  children,
  id: providedId,
}: {
  label: React.ReactNode
  error?: string
  hint?: React.ReactNode
  required?: boolean
  className?: string
  labelClassName?: string
  id?: string
  children: (props: FieldRenderProps) => React.ReactNode
}) {
  const generated = React.useId()
  const id = providedId ?? generated
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('form-field', error && 'has-error', className)}>
      <label htmlFor={id} className={labelClassName}>
        <span>
          {label}
          {required && <em aria-hidden="true"> *</em>}
        </span>
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required ? true : undefined })}
      {hint && <small id={hintId} className="form-field__hint">{hint}</small>}
      {error && (
        <small id={errorId} className="form-field__error">
          <span aria-hidden="true">⚠ </span>
          {error}
        </small>
      )}
    </div>
  )
}
