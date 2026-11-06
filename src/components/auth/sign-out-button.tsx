import { signOutAction } from "@/app/account/actions";
import { PendingButton } from "@/components/bag/pending-button";

// Plain form + Server Action: logs out even without JavaScript
export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <form action={signOutAction} className={className}>
      <PendingButton className="btn btn-secondary btn-block sm:w-auto">
        Sign out
      </PendingButton>
    </form>
  );
}
