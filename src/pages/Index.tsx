import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// "/" is redirected to /auth in App.tsx — this is a branded fallback only.
const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/auth", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading XD Rewards…</p>
      </div>
    </div>
  );
};

export default Index;
