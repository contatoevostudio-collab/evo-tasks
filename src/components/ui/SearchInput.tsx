import { FiSearch, FiX } from 'react-icons/fi';

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  size?: 'sm' | 'md';
  width?: number | string;
}

/**
 * Input de busca com ícone e botão de limpar.
 * Uso: <SearchInput value={q} onChange={setQ} placeholder="Buscar..." />
 */
export function SearchInput({
  value, onChange, placeholder = 'Buscar...', autoFocus, onSubmit, size = 'md', width = 200,
}: SearchInputProps) {
  const pad = size === 'sm' ? '4px 10px' : '6px 12px';
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--s2)',
        border: '1px solid var(--b2)',
        borderRadius: 8,
        padding: pad,
        width,
        transition: 'border-color .12s',
      }}
      onFocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--b3)')}
      onBlur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)')}
    >
      <FiSearch size={size === 'sm' ? 11 : 12} style={{ color: 'var(--t4)', flexShrink: 0 }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onSubmit) onSubmit(); }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--t1)',
          fontSize,
          minWidth: 0,
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--t4)',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <FiX size={size === 'sm' ? 11 : 12} />
        </button>
      )}
    </div>
  );
}
