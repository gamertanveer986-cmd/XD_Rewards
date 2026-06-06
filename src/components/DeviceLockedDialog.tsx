import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Smartphone, Mail, LifeBuoy } from "lucide-react";

export type DeviceLockCode =
  | "DEVICE_IN_USE"
  | "ACCOUNT_LOCKED_TO_OTHER_DEVICE"
  | "INVALID_DEVICE"
  | "AUTH_REQUIRED"
  | "UNKNOWN";

interface DeviceLockedDialogProps {
  open: boolean;
  onClose: () => void;
  code: DeviceLockCode;
  message?: string;
  email?: string;
}

const SUPPORT_EMAIL = "dxreward@gmail.com";

const COPY: Record<DeviceLockCode, { title: string; body: string; canUnlink: boolean }> = {
  DEVICE_IN_USE: {
    title: "This device is already in use",
    body: "Only one XD Rewards account is allowed per mobile device. This phone is already linked to another account. If that account belongs to you and you want to switch, an admin can unlink the device for you.",
    canUnlink: true,
  },
  ACCOUNT_LOCKED_TO_OTHER_DEVICE: {
    title: "Account locked to another device",
    body: "For your security, this account is permanently locked to the first device it logged in from. Please sign in from your original phone, or ask an admin to unlink it so you can use this device.",
    canUnlink: true,
  },
  INVALID_DEVICE: {
    title: "Device could not be verified",
    body: "We couldn’t read a valid device identifier from this phone. Please restart the app and try again. If the problem keeps happening, contact support.",
    canUnlink: false,
  },
  AUTH_REQUIRED: {
    title: "Session expired",
    body: "Your session ended before we could verify the device. Please try logging in again.",
    canUnlink: false,
  },
  UNKNOWN: {
    title: "Device check failed",
    body: "We couldn’t verify this device. Please try again, and contact support if the issue continues.",
    canUnlink: true,
  },
};

export default function DeviceLockedDialog({ open, onClose, code, message, email }: DeviceLockedDialogProps) {
  const copy = COPY[code] ?? COPY.UNKNOWN;

  const subject = encodeURIComponent(`XD Rewards – Device unlink request (${code})`);
  const bodyText = encodeURIComponent(
    [
      "Hi XD Rewards team,",
      "",
      "I’m blocked from signing in because of the one-device-per-account rule.",
      "",
      `Account email: ${email ?? "(please fill in)"}`,
      `Error code: ${code}`,
      "",
      "Please unlink my previous device so I can continue using my account from my current phone.",
      "",
      "Thanks!",
    ].join("\n"),
  );
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${bodyText}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm border-destructive/40 bg-card">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <DialogTitle className="text-center text-lg">{copy.title}</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            {copy.body}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-2">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              <span className="font-medium text-foreground">One account per device.</span>{" "}
              This protects rewards from abuse and keeps the app fair for everyone.
            </p>
          </div>
          {message && (
            <p className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/40">
              Details: {message}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {copy.canUnlink && (
            <Button asChild className="w-full gap-2">
              <a href={mailto}>
                <Mail className="h-4 w-4" />
                Request admin unlink
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full gap-2">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${subject}`}>
              <LifeBuoy className="h-4 w-4" />
              Contact support
            </a>
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
