"use client";

export function DeleteAccountButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete your account and all of your data? This cannot be undone.")) e.preventDefault();
      }}
    >
      <button type="submit" className="btn-danger">Delete my account</button>
    </form>
  );
}
