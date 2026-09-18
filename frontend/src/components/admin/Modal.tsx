export default function Modal({ open, title, onClose, children, wide }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={`relative bg-white rounded-xl shadow-lg w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h3 className="font-semibold text-navy">{title}</h3>
          <button onClick={onClose} className="text-ink-soft hover:text-navy">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
