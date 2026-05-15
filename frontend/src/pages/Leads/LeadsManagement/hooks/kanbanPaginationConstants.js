/** Leads per page for each kanban column (server page size). */
export const KANBAN_PAGE_SIZE = 50;

/** Default sort/filters for per-stage GET /leads (kanban columns). */
export const defaultKanbanListQuery = () => ({
  sortBy: 'priority',
  sortOrder: 'desc',
  status: '',
  source: '',
  search: '',
});

export const KANBAN_SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'createdAt', label: 'Created' },
  { value: 'name', label: 'Name' },
];
