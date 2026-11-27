export const inputClass =
  'mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm placeholder:text-muted/70 focus:border-brand-orange focus:outline-none'

export default function Field({ label, required, error, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-navy-700">
        {label}
        {required && <span className="text-brand-orange-dark"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  )
}