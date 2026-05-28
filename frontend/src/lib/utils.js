import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isToday(d))    return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d, yyyy');
}

export function timeAgo(date) {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isOverdue(dueDate) {
  if (!dueDate) return false;
  return isPast(new Date(dueDate));
}

export const STATUS_CONFIG = {
  todo:        { label: 'To Do',       color: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'  },
  review:      { label: 'Review',      color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  done:        { label: 'Done',        color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
};

export const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: 'bg-slate-100 text-slate-500',  icon: '↓' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-600',    icon: '→' },
  high:   { label: 'High',   color: 'bg-orange-100 text-orange-600',icon: '↑' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600',      icon: '⚡' },
};

export const CATEGORY_CONFIG = {
  bug:      { label: 'Bug',      color: 'bg-red-100 text-red-600',     icon: '🐛' },
  task:     { label: 'Task',     color: 'bg-slate-100 text-slate-600', icon: '✓'  },
  feature:  { label: 'Feature',  color: 'bg-purple-100 text-purple-600',icon: '✦' },
  question: { label: 'Question', color: 'bg-yellow-100 text-yellow-700',icon: '?' },
};

export const VERB_LABELS = {
  created:          (a) => `${a} created this ticket`,
  status_changed:   (a, f, t) => `${a} moved from ${STATUS_CONFIG[f]?.label} to ${STATUS_CONFIG[t]?.label}`,
  priority_changed: (a, f, t) => `${a} changed priority from ${f} to ${t}`,
  assigned:         (a, _, t) => `${a} assigned to ${t || 'someone'}`,
  unassigned:       (a)       => `${a} removed the assignee`,
  commented:        (a)       => `${a} added a comment`,
  attachment_added: (a, _, t) => `${a} uploaded ${t}`,
  due_date_changed: (a, f, t) => `${a} changed due date to ${t ? formatDate(t) : 'none'}`,
  title_changed:    (a)       => `${a} updated the title`,
  resolved:         (a)       => `${a} resolved this ticket`,
  reopened:         (a)       => `${a} reopened this ticket`,
};
