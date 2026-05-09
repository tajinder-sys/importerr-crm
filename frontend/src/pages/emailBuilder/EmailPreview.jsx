import { useMemo } from 'react';
import { generateEmailHtml } from './generateEmailHtml';
import { Monitor, Smartphone } from 'lucide-react';
import { useState } from 'react';

function BlockPreviewRow({ block }) {
  switch (block.type) {
    case 'heading':
      return (
        <div style={{ padding: '12px 32px 4px', fontFamily: 'system-ui, sans-serif' }}>
          {block.level === 1
            ? <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: block.color || '#111827', lineHeight: 1.3 }}>{block.content}</h1>
            : <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: block.color || '#111827', lineHeight: 1.3 }}>{block.content}</h2>}
        </div>
      );

    case 'text':
      return (
        <div style={{
          padding: '8px 32px',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 15,
          lineHeight: 1.7,
          color: block.color || '#374151',
          textAlign: block.align || 'left',
          whiteSpace: 'pre-wrap'
        }}>
          {block.content}
        </div>
      );

    case 'button':
      return (
        <div style={{ padding: '16px 32px', textAlign: block.align || 'center' }}>
          <a
            href={block.url || '#'}
            onClick={(e) => e.preventDefault()}
            style={{
              display: 'inline-block',
              backgroundColor: block.bgColor || '#4f46e5',
              color: block.textColor || '#ffffff',
              textDecoration: 'none',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              padding: '12px 28px',
              borderRadius: 6,
            }}
          >
            {block.label || 'Click Here'}
          </a>
        </div>
      );

    case 'image':
      return (
        <div style={{ padding: '12px 32px', textAlign: block.align || 'center' }}>
          {block.src
            ? <img src={block.src} alt={block.alt || ''} style={{ maxWidth: '100%', height: 'auto', borderRadius: block.rounded ? 8 : 0 }} />
            : (
              <div style={{
                height: 120,
                background: '#f3f4f6',
                border: '2px dashed #d1d5db',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                fontSize: 13,
                fontFamily: 'system-ui, sans-serif',
              }}>
                📷 Image URL not set
              </div>
            )}
        </div>
      );

    case 'divider':
      return (
        <div style={{ padding: '12px 32px' }}>
          <hr style={{ border: 'none', borderTop: `1px solid ${block.color || '#e5e7eb'}`, margin: 0 }} />
        </div>
      );

    case 'spacer':
      return <div style={{ height: block.height || 24 }} />;

    case 'columns':
      return (
        <div style={{ padding: '12px 24px', display: 'flex', gap: 16, fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#374151' }}>
          {(block.columns || []).map((col, i) => (
            <div key={i} style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{col.content}</div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

export function EmailPreview({ blocks }) {
  const [mode, setMode] = useState('desktop');

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Live Preview</span>
        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button type="button" onClick={() => setMode('desktop')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${mode === 'desktop' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </button>
          <button type="button" onClick={() => setMode('mobile')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${mode === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </button>
        </div>
      </div>

      {/* Preview frame */}
      <div className="flex-1 overflow-auto bg-gray-100 p-6">
        <div
          style={{
            maxWidth: mode === 'mobile' ? 375 : 600,
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
            transition: 'max-width 0.3s ease',
          }}
        >
          {blocks.length === 0 ? (
            <div style={{
              padding: '48px 32px',
              textAlign: 'center',
              color: '#9ca3af',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 14,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              Your email preview will appear here.<br />Add blocks to get started.
            </div>
          ) : (
            <>
              {blocks.map((block) => <BlockPreviewRow key={block.id} block={block} />)}
              <div style={{
                padding: '24px 32px 32px',
                textAlign: 'center',
                fontFamily: 'system-ui, sans-serif',
                fontSize: 12,
                color: '#9ca3af',
                borderTop: '1px solid #f3f4f6',
                marginTop: 8,
              }}>
                © {new Date().getFullYear()} Importerr.com.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}