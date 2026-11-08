import { signOutAction } from "@/app/(store)/account/actions";
import { PendingButton } from "@/components/form/pending-button";

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
