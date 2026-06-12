import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
  rightElement?: ReactNode
}

export default function Input({
  label,
  error,
  helper,
  rightElement,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          {...props}
          className={`w-full border ${
            error ? 'border-[#EF4444]' : 'border-[#E5E7EB]'
          } rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] bg-white focus:outline-none focus:ring-2 ${
            error ? 'focus:ring-[#EF4444]/30 focus:border-[#EF4444]' : 'focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B]'
          } ${rightElement ? 'pr-10' : ''} ${className}`}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-[#EF4444]">{error}</p>}
      {helper && !error && <p className="mt-1 text-xs text-[#6B7280]">{helper}</p>}
    </div>
  )
}
