import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Search, ShieldAlert, Lightbulb, Newspaper, Loader2 } from "lucide-react";
import { api } from "../lib/api";

export const SearchDialog = ({ open, onOpenChange }) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    const t = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(q)}`)
        .then((r) => setResults(r.data))
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const go = (path) => { onOpenChange(false); setQ(""); navigate(path); };

  const Section = ({ icon: Icon, title, items, pathFn }) =>
    items?.length > 0 && (
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {title}</p>
        {items.map((it) => (
          <button
            key={it.slug}
            onClick={() => go(pathFn(it))}
            data-testid={`search-result-${it.slug}`}
            className="w-full text-left px-3 py-2.5 rounded-md hover:bg-sky-500/10 transition-colors duration-150"
          >
            <p className="text-sm font-medium">{it.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{it.description || it.summary || it.excerpt}</p>
          </button>
        ))}
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="search-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-base">Search SafeNet</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search scams, tips, articles..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
            data-testid="search-input"
          />
        </div>
        <div className="max-h-72 overflow-y-auto space-y-4">
          {loading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-sky-500" /></div>}
          {results && !loading && (
            <>
              <Section icon={ShieldAlert} title="Scam Types" items={results.scams} pathFn={(it) => `/scams/${it.slug}`} />
              <Section icon={Lightbulb} title="Safety Tips" items={results.tips} pathFn={() => "/tips"} />
              <Section icon={Newspaper} title="Blog" items={results.blog} pathFn={(it) => `/blog/${it.slug}`} />
              {!results.scams?.length && !results.tips?.length && !results.blog?.length && (
                <p className="text-sm text-muted-foreground text-center py-4" data-testid="search-no-results">No results for "{q}"</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
