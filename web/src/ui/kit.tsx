import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AllocationStatus } from '@shared/types.js';

/** Round to 2 dp for display. */
export const n2 = (n: number): string =>
  (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

/** Coloured role label — QA stands out from Dev. */
export function RoleTag({ role }: { role: 'Dev' | 'QA' }) {
  return <span className={`role-tag ${role}`}>{role}</span>;
}

/** Row class that tints QA rows. */
export const roleRowClass = (role: 'Dev' | 'QA'): string | undefined =>
  role === 'QA' ? 'role-qa' : undefined;

export function StatusBadge({ status }: { status: AllocationStatus }) {
  return (
    <span className={`badge ${status}`} data-testid={`status-badge-${status}`}>
      {status}
    </span>
  );
}

export function NumberField(props: {
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  min?: number;
  testId?: string;
}) {
  const [draft, setDraft] = useState(String(props.value));
  useEffect(() => setDraft(String(props.value)), [props.value]);
  return (
    <input
      type="number"
      step={props.step ?? 1}
      min={props.min ?? 0}
      value={draft}
      data-testid={props.testId}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const v = Number(draft);
        if (Number.isFinite(v) && v !== props.value) props.onCommit(v);
        else setDraft(String(props.value));
      }}
    />
  );
}

export function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="form-row">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function FileDrop({
  accept,
  onFile,
  label,
  testId,
}: {
  accept: string;
  onFile: (f: File) => void;
  label: string;
  testId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className="filedrop"
      data-testid={testId}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      {label}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

// --- Toast --------------------------------------------------------------

interface ToastState {
  message: string;
  kind: 'info' | 'error';
}
const ToastCtx = createContext<{ show: (m: string, kind?: 'info' | 'error') => void }>({
  show: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const show = useCallback((message: string, kind: 'info' | 'error' = 'info') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast && (
        <div className={`toast ${toast.kind === 'error' ? 'error' : ''}`} data-testid="toast">
          {toast.message}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/** Run an async action, surfacing any error as a toast. */
export function useAsyncAction() {
  const { show } = useToast();
  return useCallback(
    async (fn: () => Promise<unknown>, successMsg?: string) => {
      try {
        await fn();
        if (successMsg) show(successMsg);
      } catch (err) {
        show(err instanceof Error ? err.message : 'Something went wrong', 'error');
      }
    },
    [show],
  );
}
