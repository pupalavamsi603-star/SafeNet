import { useEffect, useState } from "react";
import { Loader2, Trash2, ExternalLink, MailOpen } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const statusColor = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  reviewing: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  resolved: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};

export const ReportsView = () => {
  const [reports, setReports] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = () => api.get("/admin/reports").then((r) => setReports(r.data)).catch(() => setReports([]));
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/admin/reports/${id}`, { status });
      toast.success("Status updated");
      load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  if (!reports) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;
  if (reports.length === 0) return <p className="text-sm text-muted-foreground text-center py-16" data-testid="reports-empty">No scam reports yet.</p>;

  return (
    <div className="rounded-xl border bg-card divide-y" data-testid="admin-reports-view">
      {reports.map((r) => (
        <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`report-row-${r.id}`}>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelected(r)}>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{r.scam_category}</p>
              <Badge variant="outline" className={`text-[10px] uppercase ${statusColor[r.status]}`}>{r.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{r.description}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()} {r.reporter_name && `· by ${r.reporter_name}`}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
              <SelectTrigger className="w-32 h-9 text-xs" data-testid={`report-status-select-${r.id}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => setSelected(r)} aria-label="View details"><ExternalLink className="w-4 h-4" /></Button>
          </div>
        </div>
      ))}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="report-detail-dialog">
          <DialogHeader><DialogTitle className="font-heading">Report Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Category:</span> {selected.scam_category}</p>
              <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Description:</span> {selected.description}</p>
              {selected.scammer_phone && <p><span className="text-muted-foreground">Phone:</span> {selected.scammer_phone}</p>}
              {selected.scammer_url && <p><span className="text-muted-foreground">URL:</span> {selected.scammer_url}</p>}
              {selected.amount_lost && <p><span className="text-muted-foreground">Amount lost:</span> {selected.amount_lost}</p>}
              {selected.reporter_email && <p><span className="text-muted-foreground">Reporter:</span> {selected.reporter_name} ({selected.reporter_email})</p>}
              {selected.screenshot && <img src={selected.screenshot} alt="Report screenshot" className="rounded-lg border w-full" />}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const MessagesView = () => {
  const [messages, setMessages] = useState(null);

  const load = () => api.get("/admin/contacts").then((r) => setMessages(r.data)).catch(() => setMessages([]));
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.patch(`/admin/contacts/${id}`).catch(() => {});
    load();
  };

  if (!messages) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;
  if (messages.length === 0) return <p className="text-sm text-muted-foreground text-center py-16" data-testid="messages-empty">No contact messages yet.</p>;

  return (
    <div className="rounded-xl border bg-card divide-y" data-testid="admin-messages-view">
      {messages.map((m) => (
        <div key={m.id} className={`p-4 ${!m.read ? "bg-sky-500/5" : ""}`} data-testid={`message-row-${m.id}`}>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{m.subject}</p>
            {!m.read && <Badge className="bg-sky-500 text-white text-[10px]">New</Badge>}
            {!m.read && (
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => markRead(m.id)} data-testid={`message-mark-read-${m.id}`}>
                <MailOpen className="w-3.5 h-3.5 mr-1" /> Mark read
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{m.name} · {m.email} · {new Date(m.created_at).toLocaleString()}</p>
          <p className="text-sm mt-2 whitespace-pre-wrap">{m.message}</p>
        </div>
      ))}
    </div>
  );
};

export const UsersView = ({ onChange }) => {
  const [users, setUsers] = useState(null);

  const load = () => api.get("/admin/users").then((r) => setUsers(r.data)).catch(() => setUsers([]));
  useEffect(() => { load(); }, []);

  const remove = async (u) => {
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success("User deleted");
      load(); onChange?.();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  if (!users) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;

  return (
    <div className="rounded-xl border bg-card divide-y" data-testid="admin-users-view">
      {users.map((u) => (
        <div key={u.id} className="p-4 flex items-center gap-4" data-testid={`user-row-${u.email}`}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
          <Badge variant="outline" className={u.role === "admin" ? "text-sky-500 border-sky-500/40" : "text-muted-foreground"}>{u.role}</Badge>
          {u.role !== "admin" && (
            <Button variant="ghost" size="icon" onClick={() => remove(u)} data-testid={`user-delete-${u.email}`} aria-label="Delete user">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
