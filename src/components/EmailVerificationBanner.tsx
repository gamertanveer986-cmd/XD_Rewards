import { useState } from 'react';
import { Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export const EmailVerificationBanner = () => {
  const { user, isEmailVerified, resendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  if (isEmailVerified || !user) return null;

  const handleResend = async () => {
    setSending(true);
    const { error } = await resendVerificationEmail();
    setSending(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Email Sent",
        description: "Verification email sent. Check your inbox."
      });
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mx-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-500 text-sm">Verify Your Email</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Please verify your email to start earning. Check your inbox for the verification link.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{user.email}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResend}
              disabled={sending}
              className="h-7 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
            >
              {sending ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                "Resend"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
