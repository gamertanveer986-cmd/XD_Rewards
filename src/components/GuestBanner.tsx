import { useNavigate } from "react-router-dom";
import { useGuest } from "@/contexts/GuestContext";
import { LogIn, Info } from "lucide-react";

const GuestBanner = () => {
  const { isGuest } = useGuest();
  const navigate = useNavigate();

  if (!isGuest) return null;

  return (
    <div className="mx-4 mt-3 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
        <Info className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Login required to save progress or redeem rewards
        </p>
        <button
          onClick={() => navigate("/auth")}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <LogIn className="w-3.5 h-3.5" />
          Login / Sign Up
        </button>
      </div>
    </div>
  );
};

export default GuestBanner;
