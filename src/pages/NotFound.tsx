import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
          <Compass className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Page not found</h1>
          <p className="text-sm text-muted-foreground mt-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard")} className="w-full font-semibold">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
