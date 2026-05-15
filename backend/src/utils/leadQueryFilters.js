/** Active (open) leads — not marked completed. */
const ACTIVE_LEADS_MATCH = { isCompleted: { $ne: true } };

/** Completed leads only. */
const COMPLETED_LEADS_MATCH = { isCompleted: true };

function applyLeadCompletionFilter(query, { completedOnly = false } = {}) {
  if (completedOnly) {
    query.isCompleted = true;
  } else {
    query.isCompleted = { $ne: true };
  }
  return query;
}

module.exports = {
  ACTIVE_LEADS_MATCH,
  COMPLETED_LEADS_MATCH,
  applyLeadCompletionFilter,
};
