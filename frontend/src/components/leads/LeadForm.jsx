import { useState, useEffect, useCallback } from 'react';
import {
  User, Mail, Phone, Tag, Layers, GitBranch,
  UserCheck, MessageSquare, AlertCircle, CheckCircle2, Loader2, Info
} from 'lucide-react';

import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import SearchableSelect from '../common/SearchableSelect';
import { formatLabel } from '../../utils/helpers';

/* ─── Static option lists ─────────────────────────────────────── */
const SOURCE_OPTIONS = [
  { value: 'importerr_inquiry', label: formatLabel('importerr_inquiry') },
  { value: 'email',             label: 'Email' },
  { value: 'whatsapp',          label: 'WhatsApp' },
  { value: 'meta_ads',          label: formatLabel('meta_ads') },
  { value: 'phone',             label: 'Phone' },
];

const LEAD_TYPE_OPTIONS = [
  { value: 'guest',      label: 'Guest' },
  { value: 'registered', label: 'Registered' },
];

const STATUS_OPTIONS = [
  { value: 'new',        label: 'New' },
  { value: 'contacted',  label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'negotiation',label: 'Negotiation' },
  { value: 'converted',  label: 'Converted' },
  { value: 'lost',       label: 'Lost' },
];

/* ─── Validation rules ────────────────────────────────────────── */
const VALIDATORS = {
  name: (v) => {
    if (!v?.trim())        return 'Lead name is required';
    if (v.trim().length < 2) return 'Name must be at least 2 characters';
    return '';
  },
  email: (v) => {
    if (!v?.trim()) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email (e.g. name@example.com)';
    return '';
  },
  phone: (v) => {
    const digits = String(v || '').replace(/\D/g, '');
    const local  = digits.startsWith('91') && digits.length >= 12 ? digits.slice(2) : digits;
    if (!local)              return 'Phone number is required';
    if (local.length !== 10) return 'Must be a 10-digit Indian mobile number';
    return '';
  },
  source:   (v) => (!v ? 'Please select a lead source' : ''),
  leadType: (v) => (!v ? 'Please select a lead type'   : ''),
  status:   (v) => (!v ? 'Please select a status'      : ''),
  message:  (v) => (!v?.trim() ? 'Message / enquiry details are required' : ''),
  // optional fields — always valid
  pipelineId: () => '',
  stageId:    () => '',
  assignedTo: () => '',
};

const runValidator  = (field, value) => VALIDATORS[field]?.(value) ?? '';
const validateAll   = (values) =>
  Object.fromEntries(Object.keys(VALIDATORS).map((k) => [k, runValidator(k, values[k])]));
const anyError      = (errs)  => Object.values(errs).some(Boolean);

/* ─── FieldWrapper ─────────────────────────────────────────────
   Renders label + slot + inline error/success feedback          */
const FieldWrapper = ({ label, icon: Icon, required, touched, error, value, hint, children }) => {
  const isError   = touched && !!error;
  const isSuccess = touched && !error && !!value;

  return (
    <div className="flex flex-col gap-1">
      {/* Label */}
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide select-none">
        {Icon && <Icon size={11} className="text-slate-400" />}
        {label}
        {required && <span className="text-rose-400 text-[10px]">*</span>}
      </label>

      {/* Input slot + trailing icon */}
      <div className="relative">
        {children}
        {isError && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle size={14} className="text-rose-500" />
          </span>
        )}
        {isSuccess && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <CheckCircle2 size={14} className="text-emerald-500" />
          </span>
        )}
      </div>

      {/* Feedback line */}
      {isError ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-600">
          <AlertCircle size={10} className="flex-shrink-0" />
          {error}
        </p>
      ) : hint && !isSuccess ? (
        <p className="flex items-center gap-1 text-[11px] text-slate-400">
          <Info size={10} className="flex-shrink-0" />
          {hint}
        </p>
      ) : null}
    </div>
  );
};

/* ─── Styled text/email/tel input ─────────────────────────────── */
const StyledInput = ({ name, value, onChange, onBlur, placeholder, type = 'text', isError, isSuccess }) => (
  <input
    type={type}
    name={name}
    value={value ?? ''}
    onChange={onChange}
    onBlur={onBlur}
    placeholder={placeholder}
    autoComplete="off"
    className={`
      w-full px-3.5 py-2.5 pr-9 text-sm rounded-xl border outline-none
      placeholder:text-slate-400 text-slate-800 transition-all duration-150
      ${isError
        ? 'border-rose-300 bg-rose-50/50 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400'
        : isSuccess
          ? 'border-emerald-300 bg-emerald-50/30 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400'
          : 'border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400'
      }
    `}
  />
);

/* ─── Section divider ──────────────────────────────────────────── */
const SectionDivider = ({ title }) => (
  <div className="flex items-center gap-3 pt-1">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
      {title}
    </span>
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   LeadForm
   ═══════════════════════════════════════════════════════════════ */
const LeadForm = ({
  values,
  onChange,
  assignableMembers = [],
  canManageLeadAssignment = false,
  error: serverError,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel,
  pipelines = [],
}) => {
  const [touched,       setTouched]   = useState({});
  const [errors,        setErrors]    = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  /* Live re-validate touched fields when values change */
  useEffect(() => {
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(touched).forEach((k) => {
        if (touched[k]) next[k] = runValidator(k, values[k]);
      });
      return next;
    });
  }, [values, touched]);

  /* Derived select options */
  const selectedPipeline = pipelines.find((p) => p._id === values.pipelineId);
  const stageOptions     = selectedPipeline?.stages?.map((s) => ({ value: s._id, label: s.name })) || [];
  const pipelineOptions  = pipelines.map((p) => ({
    value: p._id,
    label: `${p.name}${p.teamId?.name ? ` — ${p.teamId.name}` : ''}`,
  }));

  const memberOptions = [
    { value: '', label: 'Unassigned' },
    ...assignableMembers
      .filter((m) => {
        if (!values.pipelineId) return true;

        const selectedPipeline = pipelines.find(
          (p) => p._id === values.pipelineId
        );
        console.log(selectedPipeline, assignableMembers);
        return (
          m?.team_id?._id === selectedPipeline?.teamId?._id
        );
      })
      .map((m) => ({
        value: m._id,
        label: `${m.name} (${m.email})`,
      })),
  ];

  console.log("memberOptions",memberOptions);

  /* Touch field on blur */
  const touch = useCallback((name) => {
    setTouched((p) => ({ ...p, [name]: true }));
    setErrors((p)  => ({ ...p, [name]: runValidator(name, values[name]) }));
  }, [values]);

  /* Handle any input / select change */
  const handleChange = useCallback((e) => {
    const { name } = e.target;
    setTouched((p) => ({ ...p, [name]: true }));
    onChange(e);
  }, [onChange]);

  /* Pipeline change → also clear stage */
  const handlePipelineChange = useCallback((e) => {
    handleChange(e);
    onChange({ target: { name: 'stageId', value: '' } });
    setTouched((p) => ({ ...p, stageId: false }));
    setErrors((p)  => ({ ...p, stageId: '' }));
  }, [handleChange, onChange]);

  /* Submit: validate everything, block if errors */
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const allTouched = Object.fromEntries(Object.keys(VALIDATORS).map((k) => [k, true]));
    setTouched(allTouched);
    const allErrors = validateAll(values);
    setErrors(allErrors);
    if (anyError(allErrors)) return;
    onSubmit(e);
  };

  /* Convenience: field state flags */
  const fs = (name) => ({
    isError:   !!(touched[name] && errors[name]),
    isSuccess: !!(touched[name] && !errors[name] && values[name]),
  });

  /* Count errors for submit hint */
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col">

      {/* ── Server error banner ───────────────────────────────── */}
      {/* {serverError && (
        <div className="flex items-start gap-2.5 px-4 py-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-rose-700 leading-relaxed">{serverError}</p>
        </div>
      )} */}

      {/* ── Scrollable form body ──────────────────────────────── */}
      <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1 pb-2">

        {/* ── Contact information ── */}
        <SectionDivider title="Contact Information" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          <FieldWrapper
            label="Lead Name" icon={User} required
            touched={touched.name} error={errors.name} value={values.name}
          >
            <StyledInput
              name="name" value={values.name} type="text"
              onChange={handleChange} onBlur={() => touch('name')}
              placeholder="e.g. Rahul Sharma"
              {...fs('name')}
            />
          </FieldWrapper>

          <FieldWrapper
            label="Email" icon={Mail} required
            touched={touched.email} error={errors.email} value={values.email}
          >
            <StyledInput
              name="email" value={values.email} type="email"
              onChange={handleChange} onBlur={() => touch('email')}
              placeholder="name@example.com"
              {...fs('email')}
            />
          </FieldWrapper>

          <FieldWrapper
            label="Phone" icon={Phone} required
            touched={touched.phone} error={errors.phone} value={values.phone}
            hint="10-digit Indian mobile number"
          >
            <StyledInput
              name="phone" value={values.phone} type="tel"
              onChange={handleChange} onBlur={() => touch('phone')}
              placeholder="+91 98765 43210"
              {...fs('phone')}
            />
          </FieldWrapper>

          <FieldWrapper
            label="Message" icon={MessageSquare} required
            touched={touched.message} error={errors.message} value={values.message}
            hint="Describe the enquiry"
          >
            <StyledInput
              name="message" value={values.message} type="text"
              onChange={handleChange} onBlur={() => touch('message')}
              placeholder="What is this lead enquiring about?"
              {...fs('message')}
            />
          </FieldWrapper>

        </div>

        {/* ── Lead details ── */}
        <SectionDivider title="Lead Details" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

          <FieldWrapper
            label="Source" icon={Tag} required
            touched={touched.source} error={errors.source} value={values.source}
          >
            <SearchableSelect
              name="source" value={values.source}
              onChange={handleChange}
              options={SOURCE_OPTIONS}
              searchable={false}
            />
          </FieldWrapper>

          <FieldWrapper
            label="Lead Type" icon={User} required
            touched={touched.leadType} error={errors.leadType} value={values.leadType}
          >
            <SearchableSelect
              name="leadType" value={values.leadType}
              onChange={handleChange}
              options={LEAD_TYPE_OPTIONS}
              searchable={false}
            />
          </FieldWrapper>

          <FieldWrapper
            label="Status" icon={CheckCircle2} required
            touched={touched.status} error={errors.status} value={values.status}
          >
            <SearchableSelect
              name="status" value={values.status || 'new'}
              onChange={handleChange}
              options={STATUS_OPTIONS}
              searchable={false}
            />
          </FieldWrapper>

        </div>

        {/* ── Pipeline assignment ── */}
        {pipelines.length > 0 && (
          <>
            <SectionDivider title="Pipeline Assignment" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <FieldWrapper
                label="Pipeline" icon={GitBranch}
                touched={touched.pipelineId} error={errors.pipelineId} value={values.pipelineId}
              >
                <SearchableSelect
                  name="pipelineId" value={values.pipelineId}
                  onChange={handlePipelineChange}
                  options={pipelineOptions}
                  placeholder="Select pipeline"
                  searchable
                />
              </FieldWrapper>

              <FieldWrapper
                label="Stage" icon={Layers}
                touched={touched.stageId} error={errors.stageId} value={values.stageId}
                hint={!values.pipelineId ? 'Select a pipeline first to unlock stages' : ''}
              >
                <div className={!values.pipelineId ? 'opacity-50 pointer-events-none' : ''}>
                  <SearchableSelect
                    name="stageId" value={values.stageId}
                    onChange={handleChange}
                    options={stageOptions}
                    placeholder={values.pipelineId ? 'Select stage' : 'Select pipeline first'}
                    searchable={false}
                    disabled={!values.pipelineId}
                  />
                </div>
              </FieldWrapper>

            </div>
          </>
        )}

        {/* ── Team assignment ── */}
        {canManageLeadAssignment && (
          <>
            <SectionDivider title="Assignment" />

            <FieldWrapper
              label="Assign To" icon={UserCheck}
              touched={touched.assignedTo} error={errors.assignedTo} value={values.assignedTo}
              hint="Leave blank to keep unassigned"
            >
              <SearchableSelect
                name="assignedTo" value={values.assignedTo}
                onChange={handleChange}
                disabled={!values.pipelineId}
                options={memberOptions}
                searchable
                placeholder="Search team members…"
              />
            </FieldWrapper>
          </>
        )}

      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-4 mt-1 border-t border-slate-100">

        {/* Validation summary (only after first submit attempt) */}
        {submitAttempted && errorCount > 0 ? (
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600">
            <AlertCircle size={12} className="flex-shrink-0" />
            {errorCount} field{errorCount > 1 ? 's need' : ' needs'} attention
          </p>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Saving…
              </>
            ) : (
              submitLabel || 'Submit'
            )}
          </button>
        </div>

      </div>
    </form>
  );
};

export default LeadForm;