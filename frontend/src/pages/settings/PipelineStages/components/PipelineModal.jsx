import { GitBranch } from 'lucide-react';
import Modal from '../../../../components/common/Modal';
import SearchableSelect from '../../../../components/common/SearchableSelect';
import Input from '../../../../components/common/Input';

const PipelineModal = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  teams,
  isEditing
}) => {
  const modalTitle = (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
        <GitBranch size={16} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-900">
          {isEditing ? 'Edit Pipeline' : 'Create New Pipeline'}
        </h2>

        <p className="text-xs text-slate-500">
          Configure your sales pipeline details
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
        form="pipeline-form"
        className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        {isEditing ? 'Update Pipeline' : 'Create Pipeline'}
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
        id="pipeline-form"
        onSubmit={onSubmit}
        className="space-y-5"
      >
        <Input
          label="Pipeline Name"
          required
          type="text"
          size="sm"
          value={formData.name}
          onChange={(e) =>
            setFormData((p) => ({
              ...p,
              name: e.target.value
            }))
          }
          placeholder="e.g. Inbound Sales, Enterprise Deals"
        //   className="border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-indigo-500/10"
        />

        <div>
          <label className="mb-1 block">
            <span className="text-sm font-medium text-gray-700">
              Assigned Team <span className="ml-1 text-red-500">*</span>
            </span>
          </label>

          <SearchableSelect
            required
            options={teams.map((t) => ({
              value: t._id,
              label: t.name
            }))}
            value={
              typeof formData.teamId === 'object'
                ? formData.teamId?._id
                : formData.teamId
            }
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                teamId: e.target.value
              }))
            }
            // className="w-full rounded-xl bg-white text-sm text-slate-800 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        <div>
          <label className="mb-1 block">
            <span className="text-sm font-medium text-gray-700">
              Description
            </span>
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
            placeholder="Describe the purpose and scope of this pipeline..."
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
      </form>
    </Modal>
  );
};

export default PipelineModal;