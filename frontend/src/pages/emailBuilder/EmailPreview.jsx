import { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';

function BlockPreviewRow({ block }) {
  switch (block.type) {
    case 'heading':
      return (
        <div style={{ padding: '12px 32px 4px' }}>
          {block.level === 1
            ? <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: block.color || '#111827', lineHeight: 1.3, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{block.content}</h1>
            : <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: block.color || '#111827', lineHeight: 1.3, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{block.content}</h2>}
        </div>
      );

    case 'text':
      return (
        <div style={{ padding: '8px 32px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 14, lineHeight: 1.75, color: block.color || '#374151', textAlign: block.align || 'left', whiteSpace: 'pre-wrap' }}>
          {block.content}
        </div>
      );

    case 'button':
      return (
        <div style={{ padding: '14px 32px', textAlign: block.align || 'center' }}>
          <a
            href={block.url || '#'}
            onClick={(e) => e.preventDefault()}
            style={{ display: 'inline-block', backgroundColor: block.bgColor || '#4f46e5', color: block.textColor || '#ffffff', textDecoration: 'none', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 13, fontWeight: 600, padding: '11px 26px', borderRadius: 6, letterSpacing: '0.01em' }}
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
              <div style={{ height: 100, background: '#f9fafb', border: '2px dashed #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12, fontFamily: 'system-ui, sans-serif', gap: 6 }}>
                <span>📷</span> Image URL not set
              </div>
            )}
        </div>
      );

    case 'divider':
      return <div style={{ padding: '8px 32px' }}><hr style={{ border: 'none', borderTop: `1px solid ${block.color || '#e5e7eb'}`, margin: 0 }} /></div>;

    case 'spacer':
      return <div style={{ height: block.height || 24 }} />;

    case 'columns':
      return (
        <div style={{ padding: '12px 24px', display: 'flex', gap: 12, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 13, color: '#374151' }}>
          {(block.columns || []).map((col, i) => (
            <div key={i} style={{ flex: 1, whiteSpace: 'pre-wrap', background: '#f9fafb', borderRadius: 8, padding: '10px 12px', lineHeight: 1.6 }}>
              {col.content}
            </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f1f5f9' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>
            Live Preview
          </span>
        </div>

        {/* Desktop / Mobile toggle */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
          {[
            { key: 'desktop', icon: <Monitor size={13} />, label: 'Desktop' },
            { key: 'mobile',  icon: <Smartphone size={13} />, label: 'Mobile' },
          ].map(({ key, icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, fontFamily: 'system-ui, sans-serif',
                transition: 'all 0.15s',
                background: mode === key ? '#ffffff' : 'transparent',
                color: mode === key ? '#1e293b' : '#94a3b8',
                boxShadow: mode === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: mode === 'mobile' ? '24px 16px' : '32px 24px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{
          width: '100%',
          maxWidth: mode === 'mobile' ? 390 : 600,
          transition: 'max-width 0.25s ease',
        }}>

          {/* Email client address bar mockup */}
          <div style={{ background: '#ffffff', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
              I
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', fontFamily: 'system-ui, sans-serif' }}>Importerr CRM</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>noreply@importerr.com → customer@example.com</div>
            </div>
            <div style={{ fontSize: 10, color: '#cbd5e1', fontFamily: 'system-ui, sans-serif', flexShrink: 0 }}>Just now</div>
          </div>

          {/* Email body */}
          <div style={{
            background: '#ffffff',
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            paddingBottom: 8,
          }}>
            {blocks.length === 0 ? (
              <div style={{ padding: '56px 32px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#64748b' }}>Your email preview will appear here</p>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8' }}>Add blocks from the left panel to get started</p>
              </div>
            ) : (
              <>
                {blocks.map((block) => <BlockPreviewRow key={block.id} block={block} />)}
                <div style={{ padding: '20px 32px 24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif', fontSize: 11, color: '#cbd5e1', borderTop: '1px solid #f1f5f9', marginTop: 12 }}>
                  © {new Date().getFullYear()} Importerr.com · All rights reserved
                </div>
              </>
            )}
          </div>

          {/* Bottom label */}
          <p style={{ textAlign: 'center', fontSize: 10, color: '#cbd5e1', marginTop: 12, fontFamily: 'system-ui, sans-serif', letterSpacing: '0.04em' }}>
            {mode === 'mobile' ? '📱 MOBILE VIEW' : '🖥 DESKTOP VIEW'} · {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
