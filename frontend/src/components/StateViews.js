import { Loader2, WifiOff, Inbox, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";

/**
 * Shared loading / error / empty views.
 *
 * These exist so a failed request never renders as "there's nothing here".
 * Before this, every list page did `.catch(() => setItems([]))`, which made a
 * down backend look identical to genuinely empty content.
 */

export function LoadingState({ label = "Loading...", className = "py-24" }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`} role="status" aria-live="polite">
      <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this",
  message = "Something went wrong reaching SafeNet. Check your connection and try again.",
  onRetry,
  className = "py-20",
  testId = "error-state",
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${className}`} role="alert" data-testid={testId}>
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5">
        <WifiOff className="w-7 h-7 text-red-500" strokeWidth={1.5} />
      </div>
      <h3 className="font-heading text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-6 rounded-full" data-testid={`${testId}-retry`}>
          <RotateCcw className="w-4 h-4 mr-2" /> Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  message = "",
  action = null,
  className = "py-20",
  testId = "empty-state",
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${className}`} data-testid={testId}>
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="font-heading text-lg font-semibold tracking-tight">{title}</h3>
      {message && <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">{message}</p>}
      {action}
    </div>
  );
}
