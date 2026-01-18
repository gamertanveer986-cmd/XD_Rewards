import { cn } from "@/lib/utils";

interface XDCoinProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showLabel?: boolean;
  amount?: number;
}

const XDCoin = ({ size = "md", className, showLabel = false, amount }: XDCoinProps) => {
  const sizeClasses = {
    sm: "w-4 h-4 text-[8px]",
    md: "w-6 h-6 text-[10px]",
    lg: "w-8 h-8 text-xs",
    xl: "w-12 h-12 text-sm",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div 
        className={cn(
          "rounded-full bg-gradient-to-br from-primary via-red-600 to-red-800 flex items-center justify-center font-black text-white shadow-lg border border-red-400/30",
          sizeClasses[size]
        )}
      >
        X
      </div>
      {showLabel && amount !== undefined && (
        <span className="font-bold">{amount.toLocaleString()}</span>
      )}
    </div>
  );
};

export default XDCoin;
