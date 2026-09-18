export function Button({ variant = 'primary', loading, children, className = '', ...props }: any) {
  const base = 'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50';
  const variants: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    ghost: 'border border-line bg-white hover:bg-paper-dim',
    danger: 'bg-danger text-white hover:bg-red-700',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading} {...props}>
      {loading ? 'Guardando...' : children}
    </button>
  );
}
