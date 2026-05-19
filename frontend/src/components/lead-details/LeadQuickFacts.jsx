import { resolveLeadRefName } from '../../utils/leadDisplay';
import { formatDateIndian, formatPhone } from '../../utils/helpers';
import LeadInfoRow from './LeadInfoRow';

export function StageLabel({ stageRef }) {
  const name = resolveLeadRefName(stageRef);
  const color = typeof stageRef === 'object' && stageRef?.color ? stageRef.color : null;
  if (name === '—') return '—';
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      {color ? (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      ) : null}
      <span>{name}</span>
    </span>
  );
}

function buildLeadFacts(lead) {
  return [
    // { label: 'Email', value: lead?.email || '—' },
    // { label: 'Phone', value: lead?.phone ? formatPhone(lead.phone) : '—' },
    { label: 'Pipeline', value: resolveLeadRefName(lead?.pipelineId) },
    { label: 'Stage', value: <StageLabel stageRef={lead?.stageId} /> },
    { label: 'Assigned', value: resolveLeadRefName(lead?.assignedTo, 'Unassigned') },
    // { label: 'Source', value: lead?.source || '—' },
    // { label: 'Status', value: lead?.status || '—' },
    { label: 'Lead type', value: lead?.leadType || '—' },
    { label: 'Submitted', value: lead?.createdAt ? formatDateIndian(lead.createdAt) : '—' },
  ];
}

/** Shared lead summary — compact grid in hero, row list in Details tab. */
export default function LeadQuickFacts({ lead, variant = 'card' }) {
  const facts = buildLeadFacts(lead);

  if (variant === 'compact') {
    return (
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {facts.map(({ label, value }) => (
          <div key={label} className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-700/40">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
            <div className="mt-0.5 flex min-w-0 items-center truncate text-[12px] font-medium text-slate-800 dark:text-slate-200">{value}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {facts.map(({ label, value }) => (
        <LeadInfoRow key={label} label={label} value={value} />
      ))}
    </>
  );
}


