import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Trash2, GripVertical, Type, MousePointerClick, Image, Minus, Space, Columns, Heading } from 'lucide-react';

// ─── Block type registry ─────────────────────────────────────────────────────

export const BLOCK_TYPES = [
  { type: 'heading',  label: 'Heading',   icon: Heading,          color: 'text-purple-600 bg-purple-50' },
  { type: 'text',     label: 'Text',      icon: Type,             color: 'text-blue-600 bg-blue-50' },
  { type: 'button',   label: 'Button',    icon: MousePointerClick, color: 'text-green-600 bg-green-50' },
  { type: 'image',    label: 'Image',     icon: Image,            color: 'text-orange-600 bg-orange-50' },
  { type: 'divider',  label: 'Divider',   icon: Minus,            color: 'text-gray-600 bg-gray-50' },
  { type: 'spacer',   label: 'Spacer',    icon: Space,            color: 'text-gray-600 bg-gray-50' },
  { type: 'columns',  label: '2 Columns', icon: Columns,          color: 'text-indigo-600 bg-indigo-50' },
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

// ─── Placeholder chip ─────────────────────────────────────────────────────────

const FRIENDLY_PLACEHOLDERS = [
  { label: '👤 Customer Name',  value: '{{name}}' },
  { label: '📧 Email',          value: '{{email}}' },
  { label: '📞 Phone',          value: '{{phone}}' },
  { label: '💬 Message',        value: '{{message}}' },
  { label: '🆔 Lead ID',        value: '{{leadId}}' },
  { label: '📦 Product SKU',    value: '{{productSku}}' },
  { label: '🔗 Link',           value: '{{link}}' },
];

export function PlaceholderBar({ onInsert }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FRIENDLY_PLACEHOLDERS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onInsert(p.value)}
          className="rounded-full border border-dashed border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── Individual block editors ─────────────────────────────────────────────────

function ColorInput({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] font-medium text-gray-500 w-16 shrink-0">{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border-0 p-0 shadow-sm" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded border border-gray-200 px-1.5 py-0.5 text-xs font-mono text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300" />
      </div>
    </div>
  );
}

function AlignSelect({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {['left', 'center', 'right'].map((a) => (
        <button key={a} type="button" onClick={() => onChange(a)}
          className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${value === a ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {a[0].toUpperCase() + a.slice(1)}
        </button>
      ))}
    </div>
  );
}

function HeadingEditor({ block, onChange, activeBlockId, onFocus, placeholderTarget }) {
  const isActive = activeBlockId === block.id;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-medium text-gray-500 shrink-0">Level</label>
        {[1, 2].map((l) => (
          <button key={l} type="button" onClick={() => onChange({ level: l })}
            className={`rounded px-2 py-0.5 text-[11px] font-bold transition ${block.level === l ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            H{l}
          </button>
        ))}
        <ColorInput label="Color" value={block.color || '#111827'} onChange={(v) => onChange({ color: v })} />
      </div>
      <textarea
        rows={2}
        value={block.content}
        onFocus={() => onFocus(block.id)}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="Heading text…"
        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm font-semibold text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      {isActive && <PlaceholderBar onInsert={(p) => onChange({ content: block.content + p })} />}
    </div>
  );
}

function TextEditor({ block, onChange, activeBlockId, onFocus }) {
  const isActive = activeBlockId === block.id;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <ColorInput label="Color" value={block.color || '#374151'} onChange={(v) => onChange({ color: v })} />
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-gray-500">Align</label>
          <AlignSelect value={block.align || 'left'} onChange={(v) => onChange({ align: v })} />
        </div>
      </div>
      <textarea
        rows={5}
        value={block.content}
        onFocus={() => onFocus(block.id)}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="Type your text here…"
        className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
      />
      {isActive && <PlaceholderBar onInsert={(p) => onChange({ content: block.content + p })} />}
    </div>
  );
}

function ButtonEditor({ block, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-500">Button Label</label>
          <input value={block.label} onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Click Here"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-gray-500">URL</label>
          <input value={block.url} onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https:// or {{link}}"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <ColorInput label="BG Color" value={block.bgColor || '#4f46e5'} onChange={(v) => onChange({ bgColor: v })} />
        <ColorInput label="Text"     value={block.textColor || '#ffffff'} onChange={(v) => onChange({ textColor: v })} />
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-gray-500">Align</label>
          <AlignSelect value={block.align || 'center'} onChange={(v) => onChange({ align: v })} />
        </div>
      </div>
    </div>
  );
}

function ImageEditor({ block, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-gray-500">Image URL</label>
        <input value={block.src} onChange={(e) => onChange({ src: e.target.value })}
          placeholder="https://example.com/image.png"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" />
      </div>
      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-medium text-gray-500">Alt Text</label>
          <input value={block.alt} onChange={(e) => onChange({ alt: e.target.value })}
            placeholder="Image description"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-gray-500">Align</label>
          <AlignSelect value={block.align || 'center'} onChange={(v) => onChange({ align: v })} />
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!block.rounded} onChange={(e) => onChange({ rounded: e.target.checked })}
            className="accent-indigo-600" />
          <span className="text-[11px] font-medium text-gray-600">Rounded</span>
        </label>
      </div>
    </div>
  );
}

function DividerEditor({ block, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <ColorInput label="Color" value={block.color || '#e5e7eb'} onChange={(v) => onChange({ color: v })} />
    </div>
  );
}

function SpacerEditor({ block, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-[11px] font-medium text-gray-500">Height (px)</label>
      <input type="range" min={8} max={80} step={4} value={block.height || 24}
        onChange={(e) => onChange({ height: Number(e.target.value) })}
        className="w-28 accent-indigo-600" />
      <span className="text-xs font-mono text-gray-600">{block.height || 24}px</span>
    </div>
  );
}

function ColumnsEditor({ block, onChange, activeBlockId, onFocus }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500">Two-column layout — edit each column separately.</p>
      {(block.columns || []).map((col, i) => (
        <div key={i}>
          <label className="mb-1 block text-[11px] font-medium text-gray-500">Column {i + 1}</label>
          <textarea
            rows={3}
            value={col.content}
            onFocus={() => onFocus(block.id)}
            onChange={(e) => {
              const cols = [...block.columns];
              cols[i] = { ...cols[i], content: e.target.value };
              onChange({ columns: cols });
            }}
            className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
          />
        </div>
      ))}
    </div>
  );
}

// ─── BlockEditor wrapper ──────────────────────────────────────────────────────

export function BlockEditor({ block, index, total, onChange, onDelete, onMove, activeBlockId, onFocus }) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = BLOCK_TYPES.find((b) => b.type === block.type);
  const Icon = meta?.icon || Type;

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
    <div className={`group rounded-xl border transition-all ${activeBlockId === block.id ? 'border-indigo-300 shadow-md shadow-indigo-50 dark:border-indigo-600' : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-600'} bg-white dark:bg-slate-800`}>
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2 select-none dark:bg-slate-800">
        <GripVertical className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-gray-400" />
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${meta?.color || 'bg-gray-50 text-gray-600'}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <button type="button" onClick={() => setCollapsed((c) => !c)} className="flex-1 text-left text-xs font-semibold text-gray-700 truncate hover:text-indigo-600 transition">
          {collapsed ? blockLabel : meta?.label || block.type}
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
          <button type="button" disabled={index === 0} onClick={() => onMove(index, 'up')}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(index, 'down')}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setCollapsed((c) => !c)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 text-[10px] font-semibold px-1.5">
            {collapsed ? 'Edit' : 'Collapse'}
          </button>
          <button type="button" onClick={() => onDelete(block.id)}
            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-gray-100 px-3 py-3 dark:border-slate-700">
          {block.type === 'heading'  && <HeadingEditor block={block} onChange={onChange} activeBlockId={activeBlockId} onFocus={onFocus} />}
          {block.type === 'text'     && <TextEditor    block={block} onChange={onChange} activeBlockId={activeBlockId} onFocus={onFocus} />}
          {block.type === 'button'   && <ButtonEditor  block={block} onChange={onChange} />}
          {block.type === 'image'    && <ImageEditor   block={block} onChange={onChange} />}
          {block.type === 'divider'  && <DividerEditor block={block} onChange={onChange} />}
          {block.type === 'spacer'   && <SpacerEditor  block={block} onChange={onChange} />}
          {block.type === 'columns'  && <ColumnsEditor block={block} onChange={onChange} activeBlockId={activeBlockId} onFocus={onFocus} />}
        </div>
      )}
    </div>
  );
}

// ─── Add Block Panel ──────────────────────────────────────────────────────────

export function AddBlockPanel({ onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400"
      >
        <span className="text-lg leading-none">＋</span> Add Block
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Choose block type</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {BLOCK_TYPES.map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => { onAdd(type); setOpen(false); }}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-xs font-semibold text-gray-700 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-4 w-4" />
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