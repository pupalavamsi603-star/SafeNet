import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

const EMPTY = { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" };

export const QuizManager = ({ onChange }) => {
  const [items, setItems] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/quiz/questions").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (it) => { setEditing(it); setForm({ question: it.question, options: [...it.options], correct_index: it.correct_index, explanation: it.explanation }); setDialogOpen(true); };

  const save = async () => {
    const opts = form.options.map((o) => o.trim()).filter(Boolean);
    if (!form.question.trim() || opts.length < 2 || !form.explanation.trim()) {
      toast.error("Question, at least 2 options, and an explanation are required."); return;
    }
    setSaving(true);
    try {
      const payload = { question: form.question, options: opts, correct_index: Number(form.correct_index), explanation: form.explanation };
      if (editing) await api.put(`/admin/quiz/${editing.id}`, payload);
      else await api.post("/admin/quiz", payload);
      toast.success(editing ? "Question updated" : "Question added");
      setDialogOpen(false);
      load(); onChange?.();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (it) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await api.delete(`/admin/quiz/${it.id}`);
      toast.success("Deleted");
      load(); onChange?.();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  if (!items) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;

  return (
    <div data-testid="admin-quiz-manager">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{items.length} quiz questions</p>
        <Button onClick={openCreate} className="rounded-full bg-sky-500 hover:bg-sky-600 text-white" data-testid="quiz-add-button">
          <Plus className="w-4 h-4 mr-1.5" /> Add Question
        </Button>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {items.map((it, idx) => (
          <div key={it.id} className="flex items-center gap-4 p-4" data-testid={`quiz-row-${idx}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-1">{it.question}</p>
              <p className="text-xs text-emerald-500 mt-0.5 line-clamp-1">Answer: {it.options[it.correct_index]}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => openEdit(it)} data-testid={`quiz-edit-${idx}`} aria-label="Edit"><Pencil className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => remove(it)} data-testid={`quiz-delete-${idx}`} aria-label="Delete"><Trash2 className="w-4 h-4 text-red-500" /></Button>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto" data-testid="quiz-form-dialog">
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Edit Question" : "New Question"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Question *</Label><Textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} data-testid="quiz-form-question" /></div>
            {form.options.map((opt, i) => (
              <div key={i} className="space-y-1.5">
                <Label>Option {String.fromCharCode(65 + i)}{i < 2 ? " *" : ""}</Label>
                <Input value={opt} onChange={(e) => { const o = [...form.options]; o[i] = e.target.value; setForm({ ...form, options: o }); }} data-testid={`quiz-form-option-${i}`} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Correct answer</Label>
              <Select value={String(form.correct_index)} onValueChange={(v) => setForm({ ...form, correct_index: Number(v) })}>
                <SelectTrigger data-testid="quiz-form-correct"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {form.options.map((o, i) => o.trim() && <SelectItem key={i} value={String(i)}>Option {String.fromCharCode(65 + i)}: {o.slice(0, 40)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Explanation *</Label><Textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} data-testid="quiz-form-explanation" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-sky-500 hover:bg-sky-600 text-white" data-testid="quiz-form-save">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
