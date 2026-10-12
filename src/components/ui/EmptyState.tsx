import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode;
}

export function EmptyState({ icon = "○", title, description, actionLabel, actionHref, children }: Props) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <span className="text-3xl mb-2" aria-hidden>{icon}</span>
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary mt-4">{actionLabel}</Link>
      )}
      {children}
    </div>
  );
}
