/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { ChevronUp, ChevronDown, Trash2, GripVertical, Type, MousePointerClick, Image, Minus, Space, Columns, Heading } from 'lucide-react';

export const BLOCK_TYPES = [
  { type: 'heading',  label: 'Heading',   icon: Heading,           color: '#7c3aed', bg: '#f5f3ff' },
  { type: 'text',     label: 'Text',      icon: Type,              color: '#2563eb', bg: '#eff6ff' },
  { type: 'button',   label: 'Button',    icon: MousePointerClick, color: '#16a34a', bg: '#f0fdf4' },
  { type: 'image',    label: 'Image',     icon: Image,             color: '#ea580c', bg: '#fff7ed' },
  { type: 'divider',  label: 'Divider',   icon: Minus,             color: '#6b7280', bg: '#f9fafb' },
  { type: 'spacer',   label: 'Spacer',    icon: Space,             color: '#6b7280', bg: '#f9fafb' },
  { type: 'columns',  label: '2 Columns', icon: Columns,           color: '#4f46e5', bg: '#eef2ff' },
];

export function defaultBlock(type, uid) {
  switch (type) {
    case 'heading':  return { id: uid(), type, content: 'Your Heading', level: 1, color: '#111827' };
    case 'text':     return { id: uid(), type, content: 'Write your message here...', color: '#374151', align: 'left' };
    case 'button':   return { id: uid(), type, label: 'Click Here', url: '', bgColor: '#4f46e5', textColor: '#ffffff', align: 'center' };
    case 'image':    return { id: uid(), type, src: '', alt: '', align: 'center', rounded: true };
    case 'divider':  return { id: uid(), type, color: '#e5e7eb' };
    case 'spacer':   return { id: uid(), type, height: 24 };
    case 'columns':  return { id: uid(), type, columns: [{ content: 'Column 1' }, { content: 'Column 2' }] };
    default:         return { id: uid(), type };
  }
}

const FRIENDLY_PLACEHOLDERS = [
  { label: '👤 Name',       value: '{{name}}' },
  { label: '📧 Email',      value: '{{email}}' },
  { label: '📞 Phone',      value: '{{phone}}' },
  { label: '💬 Message',    value: '{{message}}' },
  { label: '🆔 Lead ID',    value: '{{leadId}}' },
  { label: '📦 SKU',        value: '{{productSku}}' },
  { label: '🔗 Link',       value: '{{link}}' },
];

export function PlaceholderBar({ onInsert }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {FRIENDLY_PLACEHOLDERS.map((p) => (
        <button key={p.value} type="button" onClick={() => onInsert(p.value)}
          style={{ padding: '3px 10px', borderRadius: 20, border: '1px dashed #d1d5db', background: '#fff', fontSize: 11, fontWeight: 500, color: '#4b5563', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── shared input style ────────────────────────────────────────────
const inputStyle = {
  width: '100%', borderRadius: 8, border: '1px solid #e5e7eb',
  background: '#f9fafb', padding: '8px 10px', fontSize: 13,
  color: '#111827', fontFamily: 'system-ui, sans-serif',
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6b7280', fontFamily: 'system-ui, sans-serif', marginBottom: 4, display: 'block' };

function ColorInput({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ height: 24, width: 24, cursor: 'pointer', border: 'none', padding: 0, borderRadius: 4 }} />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: 72, borderRadius: 6, border: '1px solid #e5e7eb', padding: '2px 6px', fontSize: 11, fontFamily: 'monospace', color: '#374151', background: '#fff' }} />
    </div>
  );
}

function AlignSelect({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {['left', 'center', 'right'].map((a) => (
        <button key={a} type="button" onClick={() => onChange(a)}
          style={{ padding: '2px 8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: value === a ? '#4f46e5' : '#f3f4f6', color: value === a ? '#fff' : '#6b7280', fontFamily: 'system-ui, sans-serif' }}>
          {a[0].toUpperCase() + a.slice(1)}
        </button>
      ))}
    </div>
  );
}

function HeadingEditor({ block, onChange, activeBlockId, onFocus }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={labelStyle}>Level</span>
        {[1, 2].map((l) => (
          <button key={l} type="button" onClick={() => onChange({ level: l })}
            style={{ padding: '2px 8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: block.level === l ? '#4f46e5' : '#f3f4f6', color: block.level === l ? '#fff' : '#6b7280' }}>
            H{l}
          </button>
        ))}
        <ColorInput label="Color" value={block.color || '#111827'} onChange={(v) => onChange({ color: v })} />
      </div>
      <textarea rows={2} value={block.content} onFocus={() => onFocus(block.id)}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="Heading text…"
        style={{ ...inputStyle, resize: 'none', fontWeight: 600 }} />
      {activeBlockId === block.id && <PlaceholderBar onInsert={(p) => onChange({ content: block.content + p })} />}
    </div>
  );
}

function TextEditor({ block, onChange, activeBlockId, onFocus }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <ColorInput label="Color" value={block.color || '#374151'} onChange={(v) => onChange({ color: v })} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={labelStyle}>Align</span>
          <AlignSelect value={block.align || 'left'} onChange={(v) => onChange({ align: v })} />
        </div>
      </div>
      <textarea rows={5} value={block.content} onFocus={() => onFocus(block.id)}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="Type your text here…"
        style={{ ...inputStyle, resize: 'vertical' }} />
      {activeBlockId === block.id && <PlaceholderBar onInsert={(p) => onChange({ content: block.content + p })} />}
    </div>
  );
}

function ButtonEditor({ block, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Button Label</label>
          <input value={block.label} onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Click Here" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>URL</label>
          <input value={block.url} onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https:// or {{link}}" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
        <ColorInput label="BG" value={block.bgColor || '#4f46e5'} onChange={(v) => onChange({ bgColor: v })} />
        <ColorInput label="Text" value={block.textColor || '#ffffff'} onChange={(v) => onChange({ textColor: v })} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={labelStyle}>Align</span>
          <AlignSelect value={block.align || 'center'} onChange={(v) => onChange({ align: v })} />
        </div>
      </div>
    </div>
  );
}

function ImageEditor({ block, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={labelStyle}>Image URL</label>
        <input value={block.src} onChange={(e) => onChange({ src: e.target.value })}
          placeholder="https://example.com/image.png" style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Alt Text</label>
          <input value={block.alt} onChange={(e) => onChange({ alt: e.target.value })}
            placeholder="Image description" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={labelStyle}>Align</span>
          <AlignSelect value={block.align || 'center'} onChange={(v) => onChange({ align: v })} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#6b7280', fontFamily: 'system-ui, sans-serif' }}>
          <input type="checkbox" checked={!!block.rounded} onChange={(e) => onChange({ rounded: e.target.checked })} />
          Rounded
        </label>
      </div>
    </div>
  );
}

function DividerEditor({ block, onChange }) {
  return <ColorInput label="Color" value={block.color || '#e5e7eb'} onChange={(v) => onChange({ color: v })} />;
}

function SpacerEditor({ block, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={labelStyle}>Height (px)</span>
      <input type="range" min={8} max={80} step={4} value={block.height || 24}
        onChange={(e) => onChange({ height: Number(e.target.value) })}
        style={{ width: 100, accentColor: '#4f46e5' }} />
      <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#6b7280' }}>{block.height || 24}px</span>
    </div>
  );
}

function ColumnsEditor({ block, onChange, onFocus }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'system-ui, sans-serif' }}>Two-column layout</p>
      {(block.columns || []).map((col, i) => (
        <div key={i}>
          <label style={labelStyle}>Column {i + 1}</label>
          <textarea rows={3} value={col.content} onFocus={() => onFocus(block.id)}
            onChange={(e) => {
              const cols = [...block.columns];
              cols[i] = { ...cols[i], content: e.target.value };
              onChange({ columns: cols });
            }}
            style={{ ...inputStyle, resize: 'none' }} />
        </div>
      ))}
    </div>
  );
}

// ── BlockEditor wrapper ───────────────────────────────────────────
export function BlockEditor({ block, index, total, onChange, onDelete, onMove, activeBlockId, onFocus }) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = BLOCK_TYPES.find((b) => b.type === block.type);
  const Icon = meta?.icon || Type;
  const isActive = activeBlockId === block.id;

  const blockLabel = {
    heading: block.content?.slice(0, 30) || 'Heading',
    text:    block.content?.slice(0, 30) || 'Text Block',
    button:  block.label || 'Button',
    image:   block.alt || 'Image',
    divider: 'Divider',
    spacer:  `Spacer (${block.height || 24}px)`,
    columns: '2 Columns',
  }[block.type] || block.type;

  return (
    <div style={{
      borderRadius: 12, border: `1px solid ${isActive ? '#a5b4fc' : '#e5e7eb'}`,
      background: '#ffffff', boxShadow: isActive ? '0 0 0 3px #eef2ff' : 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fafafa', borderRadius: collapsed ? 12 : '12px 12px 0 0' }}>
        <GripVertical size={14} style={{ color: '#d1d5db', flexShrink: 0 }} />
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: meta?.bg || '#f9fafb', flexShrink: 0 }}>
          <Icon size={13} style={{ color: meta?.color || '#6b7280' }} />
        </span>
        <button type="button" onClick={() => setCollapsed((c) => !c)}
          style={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {collapsed ? blockLabel : (meta?.label || block.type)}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button type="button" disabled={index === 0} onClick={() => onMove(index, 'up')}
            style={{ padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', color: '#9ca3af', opacity: index === 0 ? 0.3 : 1 }}>
            <ChevronUp size={13} />
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(index, 'down')}
            style={{ padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: index === total - 1 ? 'not-allowed' : 'pointer', color: '#9ca3af', opacity: index === total - 1 ? 0.3 : 1 }}>
            <ChevronDown size={13} />
          </button>
          <button type="button" onClick={() => setCollapsed((c) => !c)}
            style={{ padding: '2px 8px', borderRadius: 6, border: 'none', background: '#f3f4f6', fontSize: 10, fontWeight: 600, color: '#6b7280', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>
            {collapsed ? 'Edit' : 'Collapse'}
          </button>
          <button type="button" onClick={() => onDelete(block.id)}
            style={{ padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#f87171' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #f3f4f6' }}>
          {block.type === 'heading' && <HeadingEditor block={block} onChange={onChange} activeBlockId={activeBlockId} onFocus={onFocus} />}
          {block.type === 'text'    && <TextEditor    block={block} onChange={onChange} activeBlockId={activeBlockId} onFocus={onFocus} />}
          {block.type === 'button'  && <ButtonEditor  block={block} onChange={onChange} />}
          {block.type === 'image'   && <ImageEditor   block={block} onChange={onChange} />}
          {block.type === 'divider' && <DividerEditor block={block} onChange={onChange} />}
          {block.type === 'spacer'  && <SpacerEditor  block={block} onChange={onChange} />}
          {block.type === 'columns' && <ColumnsEditor block={block} onChange={onChange} onFocus={onFocus} />}
        </div>
      )}
    </div>
  );
}

// ── Add Block Panel ───────────────────────────────────────────────
export function AddBlockPanel({ onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px dashed #d1d5db', background: 'none', fontSize: 13, fontWeight: 600, color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'system-ui, sans-serif', transition: 'all 0.15s' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'none'; }}
      >
        <span style={{ fontSize: 16 }}>＋</span> Add Block
      </button>
      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, zIndex: 20, marginTop: 8, borderRadius: 12, border: '1px solid #e5e7eb', background: '#ffffff', padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'system-ui, sans-serif' }}>Choose block type</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {BLOCK_TYPES.map(({ type, label, icon: Icon, color, bg }) => (
              <button key={type} type="button" onClick={() => { onAdd(type); setOpen(false); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 6px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fafafa', fontSize: 11, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = bg; e.currentTarget.style.color = color; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.color = '#374151'; }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: bg }}>
                  <Icon size={15} style={{ color }} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
