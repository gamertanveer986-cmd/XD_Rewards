import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, CheckCircle, Gift, FileText, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PolicyModal = ({ isOpen, onClose }: PolicyModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-primary flex items-center justify-center gap-2">
            <Shield className="w-6 h-6" />
            XD REWARDS OFFICIAL POLICY
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 100% Genuine */}
          <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg border border-success/30">
            <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-success">100% Genuine</h4>
              <p className="text-xs text-muted-foreground mt-1">
                This is a transparent and 100% fraud-free platform.
              </p>
            </div>
          </div>

          {/* No Gambling */}
          <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-primary">No Gambling</h4>
              <p className="text-xs text-muted-foreground mt-1">
                This is a 100% free app. No deposits or money payments are required.
              </p>
            </div>
          </div>

          {/* Redeem Feature */}
          <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/30">
            <Gift className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-warning">Redeem Feature</h4>
              <p className="text-xs text-muted-foreground mt-1">
                The redemption system officially launches on February 14, 2026.
              </p>
            </div>
          </div>

          {/* Full Legal Policy */}
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg border border-border">
            <FileText className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Full Legal Policy</h4>
              <Button
                variant="link"
                className="p-0 h-auto text-xs text-primary"
                asChild
              >
                <a 
                  href="https://docs.google.com/document/d/1YrPSE23jfwKsz7h5PK7nrFqgqG2D6HOt6MlB0cJINPA/edit?usp=drivesdk" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  View Full Policy <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
          </div>

          {/* Contact Support */}
          <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg border border-accent/30">
            <Mail className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Contact Support</h4>
              <Button
                variant="link"
                className="p-0 h-auto text-xs text-primary"
                asChild
              >
                <a href="mailto:Dxreward@gmail.com">
                  Dxreward@gmail.com
                </a>
              </Button>
            </div>
          </div>
        </div>

        <Button onClick={onClose} className="w-full">
          I Understand
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyModal;
