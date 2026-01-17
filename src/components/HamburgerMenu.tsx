import { useState } from "react";
import { Menu, X, Shield, Info, FileText, Mail, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
          <Menu className="w-6 h-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-red-700 rounded-xl flex items-center justify-center">
              <span className="text-xl font-black text-primary-foreground">X</span>
            </div>
            <div>
              <p className="font-bold">XD REWARDS</p>
              <p className="text-xs text-muted-foreground font-normal">Entertainment Platform</p>
            </div>
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* About Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" />
              About Us
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                XD Rewards is a rewards-based entertainment platform where users earn points by engaging with ads and activities.
              </p>
            </div>
          </div>

          {/* Official Policy */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Shield className="w-4 h-4" />
              XD REWARDS OFFICIAL POLICY
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 p-2 bg-success/10 rounded-lg">
                <span className="text-success">✓</span>
                <p className="text-muted-foreground">
                  <strong className="text-success">100% Genuine:</strong> Transparent and fraud-free platform.
                </p>
              </div>
              
              <div className="flex items-start gap-2 p-2 bg-primary/10 rounded-lg">
                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  <strong className="text-primary">No Gambling:</strong> 100% free app. No deposits required.
                </p>
              </div>
              
              <div className="flex items-start gap-2 p-2 bg-warning/10 rounded-lg">
                <span className="text-warning">🎁</span>
                <p className="text-muted-foreground">
                  <strong className="text-warning">Redeem Feature:</strong> Launches February 14, 2026.
                </p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              asChild
            >
              <a 
                href="https://docs.google.com/document/d/1YrPSE23jfwKsz7h5PK7nrFqgqG2D6HOt6MlB0cJINPA/edit?usp=drivesdk" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <FileText className="w-4 h-4" />
                Full Legal Policy
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              asChild
            >
              <a href="mailto:Dxreward@gmail.com">
                <Mail className="w-4 h-4" />
                Contact Support
              </a>
            </Button>
          </div>

          {/* Footer Disclaimer */}
          <div className="pt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Reward points do not guarantee real money. Any redemption depends on eligibility, verification, and availability.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HamburgerMenu;
