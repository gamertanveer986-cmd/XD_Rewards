import { useEffect, useState } from "react";

interface CoinAnimationProps {
  show: boolean;
  amount: number;
  onComplete?: () => void;
}

const CoinAnimation = ({ show, amount, onComplete }: CoinAnimationProps) => {
  const [coins, setCoins] = useState<{ id: number; x: number; delay: number }[]>([]);

  useEffect(() => {
    if (show) {
      const newCoins = Array.from({ length: Math.min(amount / 2, 8) }, (_, i) => ({
        id: i,
        x: Math.random() * 200 - 100,
        delay: Math.random() * 0.3,
      }));
      setCoins(newCoins);
      
      const timer = setTimeout(() => {
        setCoins([]);
        onComplete?.();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!show || coins.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="absolute animate-coin-fly"
          style={{
            "--coin-x": `${coin.x}px`,
            animationDelay: `${coin.delay}s`,
          } as React.CSSProperties}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-2 border-yellow-300 flex items-center justify-center text-xs font-black text-yellow-900 shadow-lg shadow-yellow-500/50">
            XD
          </div>
        </div>
      ))}
      <div className="animate-coin-text text-3xl font-black text-success drop-shadow-lg">
        +{amount} XD
      </div>
    </div>
  );
};

export default CoinAnimation;
