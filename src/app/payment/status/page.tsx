import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PaymentStatusPage({
  searchParams,
}: {
  searchParams: { txnid?: string; ok?: string };
}) {
  const txnid = searchParams.txnid;
  const payment = txnid
    ? await prisma.payment.findUnique({
        where: { txnid },
        include: { subscription: { include: { plan: true } } },
      })
    : null;

  const success = payment?.status === "SUCCESS";

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-lg border border-neutral-200 bg-white p-8">
        {success ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
              ✓
            </div>
            <h1 className="masthead mb-2 text-2xl font-bold">Payment successful</h1>
            <p className="mb-1 text-neutral-600">
              Your {payment?.subscription?.plan.name} subscription is now active.
            </p>
            {payment?.subscription?.endDate && (
              <p className="mb-6 text-sm text-neutral-500">
                Valid until {payment.subscription.endDate.toLocaleDateString("en-IN")}
              </p>
            )}
            <div className="flex justify-center gap-3">
              <Link href="/" className="rounded bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark">
                Start reading
              </Link>
              <Link href="/profile" className="rounded border border-neutral-300 px-4 py-2 hover:bg-neutral-50">
                My account
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
              ✕
            </div>
            <h1 className="masthead mb-2 text-2xl font-bold">Payment not completed</h1>
            <p className="mb-6 text-neutral-600">
              {payment
                ? "Your payment could not be verified or was cancelled."
                : "We couldn't find this transaction."}
            </p>
            <Link href="/subscribe" className="rounded bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark">
              Try again
            </Link>
          </>
        )}
        {txnid && <p className="mt-6 text-xs text-neutral-400">Ref: {txnid}</p>}
      </div>
    </div>
  );
}
