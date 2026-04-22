import { Link, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { projectsApi } from '@/api/projects';

const SEGMENT_LABELS: Record<string, string> = {
  requirements:  'Requirements',
  documents:     'Documents',
  traceability:  'Traceability',
  tests:         'Tests',
  fat:           'FAT',
  verification:  'Verification',
  audit:         'Audit Trail',
  settings:      'Settings',
  dashboard:     'Dashboard',
};

interface Crumb { label: string; to?: string }

function useBreadcrumbs(): Crumb[] {
  const location = useLocation();
  const { id: projectId } = useParams<{ id?: string }>();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn:  () => projectsApi.get(projectId!),
    enabled:  !!projectId,
    staleTime: 60_000,
  });

  const segments = location.pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];

  if (segments[0] === 'dashboard') {
    crumbs.push({ label: 'Dashboard' });
    return crumbs;
  }

  if (segments[0] === 'settings') {
    crumbs.push({ label: 'Settings' });
    return crumbs;
  }

  if (segments[0] === 'profile') {
    crumbs.push({ label: 'My Profile' });
    return crumbs;
  }

  if (segments[0] === 'admin') {
    crumbs.push({ label: 'Admin' });
    if (segments[1] === 'users') crumbs.push({ label: 'User Management' });
    return crumbs;
  }

  if (segments[0] === 'projects') {
    crumbs.push({ label: 'Projects', to: '/dashboard' });

    if (segments[1]) {
      crumbs.push({ label: project?.name ?? '…', to: `/projects/${segments[1]}` });
    }

    if (segments[2] && SEGMENT_LABELS[segments[2]]) {
      const isLast = !segments[3];
      crumbs.push({
        label: SEGMENT_LABELS[segments[2]],
        to: isLast ? undefined : `/projects/${segments[1]}/${segments[2]}`,
      });
    }

    if (segments[3]) {
      crumbs.push({ label: segments[3].slice(0, 8) + '…' });
    }
  }

  return crumbs;
}

export function Breadcrumb() {
  const crumbs = useBreadcrumbs();

  if (crumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-white/30 shrink-0" />}
            {c.to && !isLast ? (
              <Link to={c.to} className="text-white/50 hover:text-white/80 transition-colors truncate max-w-[140px]">
                {c.label}
              </Link>
            ) : (
              <span className="text-white/90 font-medium truncate max-w-[200px]">{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
