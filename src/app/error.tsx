"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <h1 className="headline mb-3 text-3xl">Something went wrong</h1>
      <p className="mb-8 text-ink-soft">
        An unexpected error occurred. Please try again.
      </p>
      <button onClick={reset} className="btn-primary px-5 py-2.5">
        Try again
      </button>
    </div>
  );
}
