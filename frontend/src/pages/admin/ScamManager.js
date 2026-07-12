import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

const EMPTY = { title: "", slug: "", icon: "AlertTriangle", severity: "high", description: "", how_it_works: "", warning_signs: "", prevention_tips: "", real_example: "" };

export const ScamManager = ({ onChange }) => {
  const [items, setItems] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/scam-types").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (it) => {
    setEditing(it);
    setForm({ ...it, warning_signs: (it.warning_signs || []).join("\n"), prevention_tips: (it.prevention_tips || []).join("\n") });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.how_it_works.trim()) {
      toast.error("Title, description, and 'how it works' are required."); return;
    }
    setSaving(true);
    const payload = {
      ...form,
      warning_signs: form.warning_signs.split("\n").map((s) => s.trim()).filter(Boolean),
      prevention_tips: form.prevention_tips.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    delete payload.id; delete payload.created_at;
    try {
      if (editing) await api.put(`/admin/scam-types/${editing.id}`, payload);
      else await api.post("/admin/scam-types", payload);
      toast.success(editing ? "Scam article updated" : "Scam article created");
      setDialogOpen(false);
      load(); onChange?.();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (it) => {
    if (!window.confirm(`Delete "${it.title}"?`)) return;
    try {
      await api.delete(`/admin/scam-types/${it.id}`);
      toast.success("Deleted");
      load(); onChange?.();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  if (!items) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;

  return (
    <div data-testid="admin-scam-manager">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{items.length} scam articles</p>
        <Button onClick={openCreate} className="rounded-full bg-sky-500 hover:bg-sky-600 text-white" data-testid="scam-add-button">
          <Plus className="w-4 h-4 mr-1.5" /> Add Scam Article
        </Button>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-4 p-4" data-testid={`scam-row-${it.slug}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{it.title}</p>
              <p className="text-xs text-muted-foreground truncate">{it.description}</p>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase shrink-0">{it.severity}</Badge>
            <Button variant="ghost" size="icon" onClick={() => openEdit(it)} data-testid={`scam-edit-${it.slug}`} aria-label="Edit"><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => remove(it)} data-testid={`scam-delete-${it.slug}`} aria-label="Delete"><Trash2 className="w-4 h-4 text-red-500" /></Button>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="scam-form-dialog">
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Edit Scam Article" : "New Scam Article"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="scam-form-title" /></div>
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger data-testid="scam-form-severity"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Description *</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="scam-form-description" /></div>
            <div className="space-y-1.5"><Label>How it works *</Label><Textarea value={form.how_it_works} onChange={(e) => setForm({ ...form, how_it_works: e.target.value })} data-testid="scam-form-how" /></div>
            <div className="space-y-1.5"><Label>Warning signs (one per line)</Label><Textarea value={form.warning_signs} onChange={(e) => setForm({ ...form, warning_signs: e.target.value })} data-testid="scam-form-warnings" /></div>
            <div className="space-y-1.5"><Label>Prevention tips (one per line)</Label><Textarea value={form.prevention_tips} onChange={(e) => setForm({ ...form, prevention_tips: e.target.value })} data-testid="scam-form-prevention" /></div>
            <div className="space-y-1.5"><Label>Real-life example</Label><Textarea value={form.real_example} onChange={(e) => setForm({ ...form, real_example: e.target.value })} data-testid="scam-form-example" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-sky-500 hover:bg-sky-600 text-white" data-testid="scam-form-save">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
