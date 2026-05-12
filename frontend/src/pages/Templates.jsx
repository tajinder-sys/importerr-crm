import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Eye, Plus, Pencil, Trash2, Send, Sparkles, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Snackbar from '../components/common/Snackbar';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';
import { useAuth } from '../hooks/useAuth';

import { BlockEditor, AddBlockPanel, BLOCK_TYPES } from './emailBuilder/BlockEditor';
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

function EmailBuilderModal({ isOpen, onClose, editingTemplate, normalizedType, onSave, isSaving }) {
  const [name, setName]       = useState('');
  const [slug, setSlug]       = useState('');
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks]   = useState([]);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [showPresets, setShowPresets]     = useState(false);
  const [testEmail, setTestEmail]         = useState('');
  const [testSent, setTestSent]           = useState(false);

  // Populate form when opening/editing
  useEffect(() => {
    if (!isOpen) return;
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
    setTestSent(false);
    setTestEmail('');
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
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-sm font-bold text-gray-900">
            {editingTemplate ? 'Edit' : 'Create'} Email Template
          </h1>
        </div>
        <Button type="submit" form="email-builder-form" size="sm" disabled={isSaving}>
          {isSaving ? 'Saving…' : editingTemplate ? 'Update' : 'Create'}
        </Button>
      </div>

      {/* Body: builder + preview split */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left panel: editor ── */}
        <div className="flex w-full flex-col overflow-y-auto border-r border-gray-200 lg:w-[480px] xl:w-[520px]">
          <form id="email-builder-form" onSubmit={handleSubmit} className="flex flex-col gap-0">
            {/* Meta fields */}
            <div className="space-y-3 border-b border-gray-100 bg-gray-50/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Template Info</p>
                <button
                  type="button"
                  onClick={() => setShowPresets((s) => !s)}
                  className="flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Sparkles className="h-3 w-3" />
                  {showPresets ? 'Hide Presets' : 'Use Preset'}
                </button>
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
            <div className="flex-1 space-y-2 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Content Blocks</p>
              {blocks.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-10 text-center">
                  <p className="text-sm text-gray-400">No blocks yet. Add your first block below.</p>
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
        <div className="hidden flex-1 flex-col lg:flex">
          <EmailPreview blocks={blocks} />
        </div>
      </div>
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
          className="rounded-full border border-dashed border-gray-300 bg-white px-2.5 py-1 text-[11px] font-mono text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
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

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

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
          normalizedType={normalizedType}
          onSave={saveEmailTemplate}
          isSaving={isSaving}
        />
      )}

      <div className="px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEmail
                  ? 'Build beautiful email templates with a visual block editor.'
                  : 'Create message templates with dynamic placeholders.'}
              </p>
            </div>
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
                      ? 'border-primary-200 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
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
              <h2 className="text-lg font-semibold text-gray-900">{TYPE_LABELS[normalizedType]} Templates</h2>
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
                      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {item.slug}
                          </span>
                          {isEmail && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
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
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
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
      <Modal
        isOpen={Boolean(previewTemplate)}
        onClose={() => setPreviewTemplate(null)}
        title={previewTemplate?.name ? `Preview: ${previewTemplate.name}` : 'Email Preview'}
        size="lg"
      >
        {previewTemplate && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Subject:</span> {previewTemplate.subject || '—'}
            </p>
            <div className="max-h-[55vh] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div dangerouslySetInnerHTML={{ __html: previewTemplate.body || '' }} />
            </div>
          </div>
        )}
      </Modal>

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