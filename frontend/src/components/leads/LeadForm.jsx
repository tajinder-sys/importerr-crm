import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import SearchableSelect from '../common/SearchableSelect';
import { formatLabel } from '../../utils/helpers';

const SOURCE_OPTIONS = [
  { value: 'importerr_inquiry', label: formatLabel('importerr_inquiry') },
  { value: 'email' },
  { value: 'whatsapp' },
  { value: 'meta_ads', label: formatLabel('meta_ads') },
  { value: 'phone' }
];

const LEAD_TYPE_OPTIONS = [{ value: 'guest' }, { value: 'registered' }];

const STATUS_OPTIONS = [
  { value: 'new' },
  { value: 'contacted' },
  { value: 'interested' },
  { value: 'negotiation' },
  { value: 'converted' },
  { value: 'lost' }
];

/**
 * Shared lead create/edit fields + actions. Parent owns state and submit handlers.
 */
const LeadForm = ({
  values,
  onChange,
  assignableMembers = [],
  canManageLeadAssignment = false,
  error,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel
}) => (
  <form className="max-h-[72vh] space-y-3 overflow-y-auto pr-1" onSubmit={onSubmit}>
    {error ? <Alert variant="error">{error}</Alert> : null}
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Input
        label="Lead name"
        name="name"
        value={values.name}
        onChange={onChange}
        placeholder="Enter lead name"
        required
      />
      <Input
        label="Email"
        type="email"
        name="email"
        value={values.email}
        onChange={onChange}
        placeholder="lead@example.com"
        required
      />
      <Input
        label="Phone"
        name="phone"
        value={values.phone}
        onChange={onChange}
        placeholder="+91 98765 43210"
        required
      />
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Source</label>
        <SearchableSelect
          name="source"
          value={values.source}
          onChange={onChange}
          options={SOURCE_OPTIONS}
          searchable={false}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Lead Type</label>
        <SearchableSelect
          name="leadType"
          value={values.leadType}
          onChange={onChange}
          options={LEAD_TYPE_OPTIONS}
          searchable={false}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
        <SearchableSelect
          name="status"
          value={values.status || 'new'}
          onChange={onChange}
          options={STATUS_OPTIONS}
          searchable={false}
        />
      </div>
    </div>

    {canManageLeadAssignment ? (
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Assign To User</label>
        <SearchableSelect
          name="assignedTo"
          value={values.assignedTo}
          onChange={onChange}
          options={[
            { value: '', label: 'Unassigned' },
            ...assignableMembers.map((member) => ({
              value: member._id,
              label: `${member.name} (${member.email})`
            }))
          ]}
          searchable
        />
      </div>
    ) : null}

    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" loading={loading} disabled={loading}>
        {submitLabel}
      </Button>
    </div>
  </form>
);

export default LeadForm;
