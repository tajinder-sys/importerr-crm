/** Display name for populated pipeline/stage/user refs — never show raw ObjectIds in UI. */
export const resolveLeadRefName = (ref, fallback = '—') => {
  if (ref == null || ref === '') return fallback;
  if (typeof ref === 'object') {
    return ref.name || ref.label || fallback;
  }
  return fallback;
};

export const resolveLeadRefId = (ref) => {
  if (ref == null || ref === '') return '';
  if (typeof ref === 'object' && ref?._id != null) return String(ref._id);
  return String(ref);
};
