import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auditApi, AuditLog } from '@/api/audit';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PAGE_SIZE = 30;

function userName(log: AuditLog) {
  const u = log.userId;
  if (typeof u === 'object' && u !== null) return `${u.firstName} ${u.lastName}`;
  return String(u);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

const ACTION_COLOR: Record<string, string> = {
  'user.register':        'bg-purple-600',
  'user.login':           'bg-blue-600',
  'requirement.create':   'bg-green-600',
  'document.create':      'bg-green-600',
  'document.submit':      'bg-yellow-600',
  'document.approve':     'bg-green-700',
};

function actionBadge(action: string) {
  const color = ACTION_COLOR[action] ?? 'bg-gray-600';
  return <Badge className={`${color} text-white border-0 text-xs`}>{action}</Badge>;
}

export default function AuditTrail() {
  const { id: projectId } = useParams<{ id: string }>();
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', projectId, offset],
    queryFn:  () => auditApi.getProjectAudit(projectId!, { limit: PAGE_SIZE, offset }),
  });

  const logs: AuditLog[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <AppShell>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Audit Trail</h1>
          <span className="text-sm text-muted-foreground">{total} events</span>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log._id} className="flex items-start gap-4 rounded-lg border px-4 py-3 bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {actionBadge(log.action)}
                    <span className="text-sm font-medium">{log.entityType}</span>
                    {log.entityId && <span className="text-xs text-muted-foreground font-mono">{log.entityId.slice(-8)}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {userName(log)} · {formatDate(log.createdAt)}
                  </p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-center text-muted-foreground py-12">No audit events yet.</p>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
