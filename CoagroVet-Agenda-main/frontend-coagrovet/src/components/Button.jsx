const styles = {
  primary: 'bg-brand-orange text-white hover:bg-brand-orange-dark',
  secondary: 'bg-navy-700 text-white hover:bg-navy-600',
  ghost: 'bg-white text-navy-700 border border-black/10 hover:bg-surface',
}
export default function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
