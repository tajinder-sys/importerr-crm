/** Leads per page for each kanban column (server page size). */
export const KANBAN_PAGE_SIZE = 50;

/** Default sort/filters for per-stage GET /leads (kanban columns). */
export const defaultKanbanListQuery = () => ({
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  status: '',
  source: '',
  search: '',
  assignedTo: '',
});

export const KANBAN_SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'createdAt', label: 'Created' },
  { value: 'name', label: 'Name' },
];
