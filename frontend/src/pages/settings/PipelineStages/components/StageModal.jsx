import { Layers } from 'lucide-react';
import Modal from '../../../../components/common/ui/Modal';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#ef4444',
];

const StageModal = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  pipelines,
  isEditing
}) => {
  const modalTitle = (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
        <Layers size={16} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-900">
          {isEditing ? 'Edit Stage' : 'Create New Stage'}
        </h2>
        <p className="text-xs text-slate-500">
          Configure your pipeline stage details
        </p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        form="stage-form"
        className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
      >
        {isEditing ? 'Update Stage' : 'Create Stage'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      footer={footer}
      size="md"
    >
      <form
        id="stage-form"
        onSubmit={onSubmit}
        className="space-y-5"
      >
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Stage Name <span className="text-rose-500">*</span>
            </label>

            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  name: e.target.value
                }))
              }
              placeholder="e.g. Qualified, Proposal..."
              required
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
            />
          </div>

          <div className="w-24">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Order <span className="text-rose-500">*</span>
            </label>

            <input
              type="number"
              min="0"
              required
              value={formData.order}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  order: parseInt(e.target.value) || 0
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Follow-up time (days)
            </label>
            <input
              type="number"
              min={0}
              max={365}
              step={1}
              value={formData.followUpDays ?? ''}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  followUpDays: e.target.value,
                }))
              }
              placeholder="e.g. 7"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Suggested days until the next follow-up while a deal is in this stage. Leave empty if not used.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Win probability (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={formData.probabilityPercent ?? ''}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  probabilityPercent: e.target.value,
                }))
              }
              placeholder="e.g. 25"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Expected chance to close when the deal reaches this stage (0–100%).
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Pipeline <span className="text-rose-500">*</span>
          </label>

          <select
            required
            value={formData.pipelineId}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                pipelineId: e.target.value
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
          >
            <option value="">Select pipeline</option>

            {pipelines.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Stage Color
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    color: c
                  }))
                }
                className={`h-8 w-8 rounded-full transition ${
                  formData.color === c
                    ? 'scale-110 ring-2 ring-slate-400 ring-offset-2'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}

            <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 text-xs font-bold text-slate-400 transition hover:border-slate-400">
              +

              <input
                type="color"
                value={formData.color || '#6366f1'}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    color: e.target.value
                  }))
                }
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>

            <span
              className="ml-1 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: `${formData.color || '#6366f1'}20`,
                color: formData.color || '#6366f1',
                border: `1px solid ${formData.color || '#6366f1'}40`,
              }}
            >
              Preview
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Description
          </label>

          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                description: e.target.value
              }))
            }
            placeholder="What happens at this stage?"
            className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Stage Active</p>
            <p className="mt-0.5 text-xs text-slate-400">Inactive stages won't appear in deal flows</p>
          </div>
          <button
            type="button"
            onClick={() => setFormData((p) => ({ ...p, isActive: !p.isActive }))}
            className={`relative h-6 w-11 rounded-full transition ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${formData.isActive ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50 p-3">
          <div>
            <p className="text-sm font-medium text-violet-800">Count as Conversion</p>
            <p className="mt-0.5 text-xs text-violet-500">Leads in this stage will be counted in conversion rate</p>
          </div>
          <button
            type="button"
            onClick={() => setFormData((p) => ({ ...p, isConversion: !p.isConversion }))}
            className={`relative h-6 w-11 rounded-full transition ${formData.isConversion ? 'bg-violet-600' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${formData.isConversion ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StageModal;