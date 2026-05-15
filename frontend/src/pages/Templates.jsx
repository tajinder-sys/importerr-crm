import { useCallback, useEffect, useState, startTransition } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Eye, Plus, Pencil, Trash2, Sparkles, X, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/common/ui/Card';
import Button from '../components/common/ui/Button';
import Input from '../components/common/ui/Input';
import Modal from '../components/common/ui/Modal';
import Snackbar from '../components/common/ui/Snackbar';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

import { BlockEditor, AddBlockPanel } from './emailBuilder/BlockEditor';
import { EmailPreview } from './emailBuilder/EmailPreview';
import { generateEmailHtml, htmlToBlocks, parseBodyJson, uid } from './emailBuilder/generateEmailHtml';
import { TEMPLATE_PRESETS } from './emailBuilder/templatePresets';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES = ['email', 'whatsapp'];
const TYPE_LABELS    = { email: 'Email', whatsapp: 'WhatsApp' };
const WA_PLACEHOLDERS = ['{{name}}', '{{email}}', '{{phone}}', '{{message}}', '{{leadId}}', '{{productSku}}'];

const defaultForm = { name: '', slug: '', subject: '', body: '', bodyJson: [] };

// ─── Helper: auto-generate slug ───────────────────────────────────────────────

function toSlug(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Email Builder Modal ──────────────────────────────────────────────────────

function EmailBuilderModal({ isOpen, onClose, editingTemplate, onSave, isSaving }) {
  const { theme } = useTheme();
  const [name, setName]       = useState('');
  const [slug, setSlug]       = useState('');
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks]   = useState([]);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [showPresets, setShowPresets]     = useState(false);
  const [aiModalOpen, setAiModalOpen]     = useState(false);
  const [aiDesc, setAiDesc]               = useState('');
  const [isAiLoading, setIsAiLoading]     = useState(false);

  // Remove dark class from html when builder is open, restore on close
  useEffect(() => {
    const root = document.documentElement;
    if (isOpen) {
      root.classList.remove('dark');
    } else if (theme === 'dark') {
      root.classList.add('dark');
    }
    return () => {
      if (theme === 'dark') root.classList.add('dark');
    };
  }, [isOpen, theme]);

  // Populate form when opening/editing
  useEffect(() => {
    if (!isOpen) return;
    startTransition(() => {
      if (editingTemplate) {
        setName(editingTemplate.name || '');
        setSlug(editingTemplate.slug || '');
        setSubject(editingTemplate.subject || '');
        const parsed = parseBodyJson(editingTemplate.bodyJson);
        if (parsed) {
          setBlocks(parsed.map((b) => ({ ...b, id: b.id || uid() })));
        } else if (editingTemplate.body) {
          // Backward compat: convert legacy HTML → text block
          setBlocks(htmlToBlocks(editingTemplate.body));
        } else {
          setBlocks([]);
        }
      } else {
        setName('');
        setSlug('');
        setSubject('');
        setBlocks([]);
      }
      setShowPresets(false);
    });
  }, [isOpen, editingTemplate]);

  // Block operations
  const addBlock = (type) => {
    const newBlock = (() => {
      switch (type) {
        case 'heading': return { id: uid(), type, content: 'Your Heading', level: 1, color: '#111827' };
        case 'text':    return { id: uid(), type, content: '', color: '#374151', align: 'left' };
        case 'button':  return { id: uid(), type, label: 'Click Here', url: '', bgColor: '#4f46e5', textColor: '#ffffff', align: 'center' };
        case 'image':   return { id: uid(), type, src: '', alt: '', align: 'center', rounded: true };
        case 'divider': return { id: uid(), type, color: '#e5e7eb' };
        case 'spacer':  return { id: uid(), type, height: 24 };
        case 'columns': return { id: uid(), type, columns: [{ content: 'Column 1' }, { content: 'Column 2' }] };
        default:        return { id: uid(), type };
      }
    })();
    setBlocks((prev) => [...prev, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const updateBlock = (id, patch) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
  };

  const deleteBlock = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  };

  const moveBlock = (index, dir) => {
    setBlocks((prev) => {
      const next = [...prev];
      const swap = dir === 'up' ? index - 1 : index + 1;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  };

  const handleAiGenerate = async () => {
    if (!aiDesc.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await api.post(API_ROUTES.templates.aiGenerate, { description: aiDesc.trim() });
      const generated = res?.data;
      setAiModalOpen(false);
      setAiDesc('');
      const raw = generated?.bodyJson;
      let parsedBlocks = [];
      try {
        const p = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) && typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw);
        parsedBlocks = Array.isArray(p) ? p.map((b) => ({ ...b, id: b.id || uid() })) : [];
      } catch { parsedBlocks = []; }
      setName(generated?.name || '');
      setSlug(generated?.slug || '');
      setSubject(generated?.subject || '');
      setBlocks(parsedBlocks);
    } catch (err) {
      console.log('AI generation error:', err);
      // silently ignore — parent snackbar will show
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyPreset = (preset) => {
    setName(preset.name);
    setSlug(toSlug(preset.name));
    setSubject(preset.subject);
    setBlocks(preset.blocks());
    setShowPresets(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const bodyJson = blocks;
    const bodyHtml = generateEmailHtml(blocks);
    await onSave({
      name:    name.trim(),
      slug:    slug.trim(),
      subject: subject.trim(),
      body:    bodyHtml,       // keep legacy field for backward compat
      bodyJson: JSON.stringify(bodyJson),
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 64, borderBottom: '1px solid #e5e7eb', background: '#ffffff', padding: '0 16px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <button type="button" onClick={onClose} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
          <X size={18} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#4f46e5', flexShrink: 0 }}>I</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {editingTemplate ? `Editing — ${editingTemplate.name}` : 'New Email Template'}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'system-ui, sans-serif' }}>Email Builder</p>
        </div>
        <Button type="submit" form="email-builder-form" size="sm" disabled={isSaving}>
          {isSaving ? 'Saving…' : editingTemplate ? 'Update Template' : 'Create Template'}
        </Button>
      </div>

      {/* Body: builder + preview split */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* ── Left panel: editor ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', borderRight: '1px solid #e5e7eb', width: '100%', maxWidth: 520, background: '#ffffff' }}>
          <form id="email-builder-form" onSubmit={handleSubmit} className="flex flex-col gap-0">
            {/* Meta fields */}
            <div style={{ padding: 16, borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, sans-serif' }}>Template Info</p>
                <div className="flex items-center gap-2">
                  {/* AI Generate button — next to preset */}
                  <button
                    type="button"
                    onClick={() => setAiModalOpen(true)}
                    className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    <Wand2 className="h-3 w-3" />
                    AI Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPresets((s) => !s)}
                    className="flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <Sparkles className="h-3 w-3" />
                    {showPresets ? 'Hide Presets' : 'Use Preset'}
                  </button>
                </div>
              </div>

              {/* Presets picker */}
              {showPresets && (
                <div className="grid grid-cols-1 gap-2">
                  {TEMPLATE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{preset.label}</p>
                        <p className="text-xs text-gray-500">{preset.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Template Name"
                    value={name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setName(v);
                      if (!editingTemplate) setSlug(toSlug(v));
                    }}
                    placeholder="e.g. Inquiry Follow Up"
                    required
                  />
                </div>
                <Input
                  label="Subject Line"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Hi {{name}}, we got your message!"
                  required
                />
                <Input
                  label="Slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="inquiry-follow-up"
                  required
                />
              </div>
            </div>

            {/* Block list */}
            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, sans-serif' }}>Content Blocks</p>
              {blocks.length === 0 && (
                <div style={{ borderRadius: 12, border: '2px dashed #e5e7eb', background: '#f9fafb', padding: '40px 20px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#9ca3af', fontFamily: 'system-ui, sans-serif' }}>No blocks yet. Add your first block below.</p>
                </div>
              )}
              {blocks.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  index={index}
                  total={blocks.length}
                  onChange={(patch) => updateBlock(block.id, patch)}
                  onDelete={deleteBlock}
                  onMove={moveBlock}
                  activeBlockId={activeBlockId}
                  onFocus={setActiveBlockId}
                />
              ))}
              <AddBlockPanel onAdd={addBlock} />
            </div>
          </form>
        </div>

        {/* ── Right panel: live preview ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <EmailPreview blocks={blocks} />
        </div>
      </div>

      {/* ── AI Modal inside builder (z-60 so it's above builder) ── */}
      {aiModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', fontFamily: 'system-ui, sans-serif' }}>AI Template Generator</span>
              </div>
              <button type="button" onClick={() => { setAiModalOpen(false); setAiDesc(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
                Describe the email you need — AI will generate blocks instantly. Same description returns cached result.
              </p>
              <textarea
                rows={4}
                value={aiDesc}
                onChange={(e) => setAiDesc(e.target.value)}
                placeholder="e.g. Follow-up email for bulk order customers who haven't responded in 3 days"
                disabled={isAiLoading}
                style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 12px', fontSize: 13, fontFamily: 'system-ui, sans-serif', resize: 'vertical', outline: 'none', color: '#1e293b', boxSizing: 'border-box' }}
              />
              {isAiLoading && (
                <p style={{ margin: 0, fontSize: 12, color: '#6366f1', fontFamily: 'system-ui, sans-serif' }}>✨ AI is crafting your template…</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
              <button type="button" onClick={() => { setAiModalOpen(false); setAiDesc(''); }} disabled={isAiLoading}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>
                Cancel
              </button>
              <button type="button" onClick={handleAiGenerate} disabled={isAiLoading || !aiDesc.trim()}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: isAiLoading || !aiDesc.trim() ? '#c7d2fe' : '#6366f1', fontSize: 13, fontWeight: 600, color: '#fff', cursor: isAiLoading || !aiDesc.trim() ? 'not-allowed' : 'pointer', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wand2 size={13} />
                {isAiLoading ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WhatsApp placeholders ─────────────────────────────────────────────────────

function WaPlaceholderBar({ onInsert }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WA_PLACEHOLDERS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onInsert(p)}
          className="rounded-full border border-dashed border-gray-300 bg-white px-2.5 py-1 text-[11px] font-mono text-gray-600 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ─── Main Templates page ──────────────────────────────────────────────────────

const Templates = () => {
  const { type }    = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const normalizedType = String(type || '').toLowerCase();
  const isValidType    = TEMPLATE_TYPES.includes(normalizedType);
  const isAdmin        = user?.role === 'admin';

  const [templates, setTemplates]           = useState([]);
  const [isLoading, setIsLoading]           = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [isDeleting, setIsDeleting]         = useState(false);

  // Email builder modal
  const [builderOpen, setBuilderOpen]       = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // WhatsApp modal
  const [waModalOpen, setWaModalOpen]       = useState(false);
  const [waForm, setWaForm]                 = useState(defaultForm);
  const [waEditing, setWaEditing]           = useState(null);

  // Preview / delete
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [deleteTemplate, setDeleteCandidate]  = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });
  const showMessage = (message, typeValue = 'success') =>
    setSnackbar({ open: true, message, type: typeValue });

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    if (!isValidType) return;
    setIsLoading(true);
    try {
      const response = await api.get(API_ROUTES.templates.list, { params: { type: normalizedType } });
      console.log(response?.data?.[0]); // check if bodyJson exists

      setTemplates(response?.data || []);
    } catch (error) {
      showMessage(error?.message || 'Failed to load templates', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isValidType, normalizedType]);

  useEffect(() => { const run = async () => { await fetchTemplates(); }; run(); }, [fetchTemplates]);

  // ── Email builder save ─────────────────────────────────────────────────────

  const saveEmailTemplate = async (payload) => {
    setIsSaving(true);
    try {
      const body = { type: 'email', ...payload };
      if (editingTemplate?._id) {
        await api.put(API_ROUTES.templates.update(editingTemplate._id), body);
        showMessage('Template updated successfully');
      } else {
        await api.post(API_ROUTES.templates.create, body);
        showMessage('Template created successfully');
      }
      setBuilderOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      showMessage(error?.message || 'Failed to save template', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── WhatsApp modal ops ─────────────────────────────────────────────────────

  const openWaCreate = () => { setWaEditing(null); setWaForm(defaultForm); setWaModalOpen(true); };
  const openWaEdit   = (t)  => {
    setWaEditing(t);
    setWaForm({ name: t.name || '', slug: t.slug || '', subject: '', body: t.body || '' });
    setWaModalOpen(true);
  };
  const closeWaModal = () => { setWaModalOpen(false); setWaEditing(null); setWaForm(defaultForm); };

  const submitWa = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        type: 'whatsapp',
        name: waForm.name.trim(),
        slug: waForm.slug.trim(),
        subject: '',
        body: waForm.body.trim(),
      };
      if (waEditing?._id) {
        await api.put(API_ROUTES.templates.update(waEditing._id), payload);
        showMessage('Template updated successfully');
      } else {
        await api.post(API_ROUTES.templates.create, payload);
        showMessage('Template created successfully');
      }
      closeWaModal();
      fetchTemplates();
    } catch (error) {
      showMessage(error?.message || 'Failed to save template', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const removeTemplate = async (id) => {
    setIsDeleting(true);
    try {
      await api.delete(API_ROUTES.templates.delete(id));
      showMessage('Template deleted successfully');
      fetchTemplates();
      setDeleteCandidate(null);
    } catch (error) {
      showMessage(error?.message || 'Failed to delete template', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (!isAdmin)    return <Navigate to="/dashboard" replace />;
  if (!isValidType) return <Navigate to="/templates/email" replace />;

  const isEmail = normalizedType === 'email';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Full-screen email builder */}
      {isEmail && (
        <EmailBuilderModal
          isOpen={builderOpen}
          onClose={() => { setBuilderOpen(false); setEditingTemplate(null); }}
          editingTemplate={editingTemplate}
          onSave={saveEmailTemplate}
          isSaving={isSaving}
        />
      )}

      <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
        <div className="mx-auto max-w-full space-y-6">

          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Templates</h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEmail
                  ? 'Build beautiful email templates with a visual block editor.'
                  : 'Create message templates with dynamic placeholders.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="md"
                startIcon={isEmail ? <Sparkles className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                onClick={() => {
                  if (isEmail) { setEditingTemplate(null); setBuilderOpen(true); }
                  else { openWaCreate(); }
                }}
              >
                {isEmail ? 'Open Email Builder' : 'Create Template'}
              </Button>
            </div>
          </div>

          {/* Type tabs */}
          <div className="flex items-center gap-2">
            {TEMPLATE_TYPES.map((item) => {
              const active = item === normalizedType;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => navigate(`/templates/${item}`)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200'
                  }`}
                >
                  {TYPE_LABELS[item]}
                </button>
              );
            })}
          </div>

          {/* Template list */}
          <Card className="rounded-2xl border-gray-200 shadow-sm">
            <CardHeader className="border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{TYPE_LABELS[normalizedType]} Templates</h2>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-gray-500">Loading templates…</p>
              ) : templates.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">No templates found.</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {isEmail ? 'Click "Open Email Builder" to create your first template.' : 'Click "Create Template" to get started.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 md:flex-row md:items-start md:justify-between dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-slate-700 dark:text-slate-400">
                            {item.slug}
                          </span>
                          {isEmail && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                              ✉️ Email
                            </span>
                          )}
                        </div>
                        {isEmail && (
                          <p className="text-xs text-gray-500">
                            <span className="font-medium text-gray-600">Subject:</span> {item.subject || '—'}
                          </p>
                        )}
                        {!isEmail && (
                          <>
                            <p className="line-clamp-2 text-xs text-gray-500">{item.body}</p>
                            <p className="text-[11px] text-gray-400">
                              Placeholders: {item.placeholders?.length ? item.placeholders.map((x) => `{{${x}}}`).join(', ') : 'None'}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isEmail && (
                          <Button
                            type="button" size="sm" variant="outline" iconOnly
                            title="Preview" aria-label="Preview email"
                            onClick={() => setPreviewTemplate(item)}
                            startIcon={<Eye className="h-4 w-4" />}
                          >
                            <span className="sr-only">Preview</span>
                          </Button>
                        )}
                        <Button
                          type="button" size="sm" variant="outline"
                          onClick={() => {
                            if (isEmail) { setEditingTemplate(item); setBuilderOpen(true); }
                            else { openWaEdit(item); }
                          }}
                          startIcon={<Pencil className="h-4 w-4" />}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button" size="sm" variant="outline"
                          onClick={() => setDeleteCandidate(item)}
                          disabled={isDeleting}
                          startIcon={<Trash2 className="h-4 w-4" />}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── WhatsApp modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={waModalOpen}
        onClose={closeWaModal}
        title={`${waEditing ? 'Edit' : 'Create'} WhatsApp Template`}
        size="lg"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeWaModal}>Cancel</Button>
            <Button type="submit" form="wa-template-form" disabled={isSaving}>
              {isSaving ? 'Saving…' : waEditing ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        )}
      >
        <form id="wa-template-form" className="space-y-4" onSubmit={submitWa}>
          <Input
            label="Template Name"
            value={waForm.name}
            onChange={(e) => {
              const v = e.target.value;
              setWaForm((prev) => ({
                ...prev,
                name: v,
                slug: waEditing ? prev.slug : toSlug(v),
              }));
            }}
            placeholder="e.g. Inquiry Follow Up"
            required
          />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Message Body</label>
            <textarea
              rows={8}
              value={waForm.body}
              onChange={(e) => setWaForm((prev) => ({ ...prev, body: e.target.value }))}
              placeholder="Type your template content with placeholders like {{name}}"
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
              required
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Insert Placeholder</p>
            <WaPlaceholderBar onInsert={(p) => setWaForm((prev) => ({ ...prev, body: prev.body + p }))} />
          </div>
        </form>
      </Modal>

      {/* ── Email preview modal ─────────────────────────────────────────────── */}
      {Boolean(previewTemplate) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'system-ui, sans-serif' }}>{previewTemplate.name}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280', fontFamily: 'system-ui, sans-serif' }}>
                  <span style={{ fontWeight: 600 }}>Subject:</span> {previewTemplate.subject || '—'}
                </p>
              </div>
              <button type="button" onClick={() => setPreviewTemplate(null)}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                <X size={16} />
              </button>
            </div>
            {/* iframe — isolated from dark mode, renders full HTML correctly */}
            <iframe
              srcDoc={previewTemplate.body || '<p style="padding:32px;color:#9ca3af;font-family:system-ui,sans-serif">No content</p>'}
              style={{ flex: 1, border: 'none', width: '100%', minHeight: 500 }}
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(deleteTemplate)}
        onClose={() => setDeleteCandidate(null)}
        title="Delete Template"
        size="sm"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteCandidate(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={() => removeTemplate(deleteTemplate?._id)} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        )}
      >
        <p className="text-sm text-gray-700">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-900">{deleteTemplate?.name || 'this template'}</span>?
          This action cannot be undone.
        </p>
      </Modal>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
};

export default Templates;