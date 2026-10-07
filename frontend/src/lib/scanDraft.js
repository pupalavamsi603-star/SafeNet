import { useCallback, useEffect, useRef, useState } from "react";

export const DRAFT_TTL = 15 * 60 * 1000;
const PREFIX = "safenet-journey:";
const EMPTY = { input: "", result: null, savedFor: null };
const allowed = new Set(["url", "qr", "detect", "report", "contact", "selected-result"]);
export function readDraft(key) {
  if (!allowed.has(key)) return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    if (raw.length > 65000) { sessionStorage.removeItem(PREFIX + key); return null; }
    const doc = JSON.parse(raw);
    if (!Number.isFinite(doc.expires) || doc.expires <= Date.now() || doc.expires > Date.now() + DRAFT_TTL + 1000) {
      sessionStorage.removeItem(PREFIX + key); return null;
    }
    return doc.value;
  } catch { removeDraft(key); return null; }
}
export function writeDraft(key, value) {
  if (!allowed.has(key)) return;
  try {
    const raw = JSON.stringify({ expires: Date.now() + DRAFT_TTL, value });
    if (raw.length <= 65000) sessionStorage.setItem(PREFIX + key, raw);
    else removeDraft(key);
  } catch { /* Storage may be disabled. The in-memory check still works. */ }
}
export function removeDraft(key) { try { sessionStorage.removeItem(PREFIX + key); } catch {} }
export function clearJourneyDrafts() { allowed.forEach(removeDraft); }
export function purgeExpiredDrafts() { allowed.forEach(readDraft); }
export function selectResult(kind) { writeDraft("selected-result", { kind }); }
export function useScanDraft(kind, enabled, owner = "guest") {
  const restore = useCallback(() => {
    const saved = enabled && readDraft(kind);
    const selected = readDraft("selected-result")?.kind === kind;
    return saved && typeof saved.input === "string" && saved.input.length <= 6000 && (saved.owner === owner || (saved.owner === "guest" && selected)) ? saved : EMPTY;
  }, [kind, enabled, owner]);
  const [state, setState] = useState(restore);
  const latest = useRef(state);
  useEffect(() => { const next = restore(); latest.current = next; setState(next); }, [restore]);
  const update = useCallback((changes) => {
    const next = { ...latest.current, ...changes, owner };
    latest.current = next; setState(next);
    if (enabled) writeDraft(kind, next);
  }, [kind, enabled, owner]);
  return [state, update];
}
