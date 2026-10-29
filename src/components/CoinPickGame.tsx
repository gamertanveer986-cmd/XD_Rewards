import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGuest } from "@/contexts/GuestContext";
import XDCoin from "@/components/XDCoin";
import { CheckCircle, Gamepad2, Sparkles, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CoinPickGameProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  onGameComplete: (coinsEarned: number) => void;
}

const GUEST_COINS_PER_WIN = 10;
const BOX_COUNT = 4;

const randomCoinIndex = () => Math.floor(Math.random() * BOX_COUNT);

const CoinPickGame = ({ isOpen, onClose, userId, onGameComplete }: CoinPickGameProps) => {
  const { t } = useTranslation();
  const { isGuest, addGuestCoins } = useGuest();

  const [coinIndex, setCoinIndex] = useState(randomCoinIndex);
  const [opened, setOpened] = useState<number[]>([]);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCoinIndex(randomCoinIndex());
      setOpened([]);
      setCoinsEarned(0);
      setClaiming(false);
    }
  }, [isOpen]);

  const grantReward = async (picked: number) => {
    setClaiming(true);
    try {
      if (isGuest || !userId) {
        addGuestCoins(GUEST_COINS_PER_WIN);
        setCoinsEarned(GUEST_COINS_PER_WIN);
        toast.success(t("game.earnedToast", { coins: GUEST_COINS_PER_WIN }));
        onGameComplete(GUEST_COINS_PER_WIN);
        return;
      }

      const { data, error } = await supabase.rpc("record_ad_completion", {
        p_user_id: userId,
        p_ad_duration: 15,
      });
      if (error) throw error;
      const result = data as { earnings: number; success: boolean };
      const coins = Math.floor((result?.earnings ?? 0) * 100) || GUEST_COINS_PER_WIN;
      setCoinsEarned(coins);
      toast.success(t("game.earnedToast", { coins }));
      onGameComplete(coins);
    } catch (err: any) {
      console.error("[CoinPickGame] reward failed:", err);
      toast.error("Failed to record reward. Please try again.");
      // Re-open the winning box so the player can claim again.
      setOpened((prev) => prev.filter((i) => i !== picked));
    } finally {
      setClaiming(false);
    }
  };

  const pickBox = (index: number) => {
    if (claiming || opened.includes(index) || coinsEarned > 0) return;
    const nextOpened = [...opened, index];
    setOpened(nextOpened);
    if (index === coinIndex) grantReward(index);
  };

  const won = coinsEarned > 0;
  const closedBoxes = BOX_COUNT - opened.length;

  const handleClose = () => {
    if (claiming) return;
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            {won ? (
              <><CheckCircle className="w-5 h-5 text-success" /> {t("game.wonTitle")}</>
            ) : (
              <><Gamepad2 className="w-5 h-5 text-primary" /> {t("game.gameTitle")}</>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            {won
              ? t(isGuest ? "game.savedGuest" : "game.addedBalance")
              : t("game.pickHint")}
          </p>

          {/* 4-box grid */}
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: BOX_COUNT }).map((_, index) => {
              const isOpened = opened.includes(index);
              const isWinning = index === coinIndex && isOpened;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => pickBox(index)}
                  disabled={isOpened || claiming || won}
                  aria-label={`Box ${index + 1}`}
                  className={`relative aspect-square rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                    isWinning
                      ? "border-success/60 bg-success/15 shadow-lg shadow-success/10"
                      : isOpened
                        ? "border-border/40 bg-muted/20 opacity-50"
                        : "border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 active:scale-95"
                  }`}
                >
                  {isWinning ? (
                    <>
                      <XDCoin size="md" />
                      <span className="text-xs font-semibold text-success">
                        +{coinsEarned || "..."} XD Coins
                      </span>
                    </>
                  ) : isOpened ? (
                    <XCircle className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-primary/70" />
                  )}
                  <span className="absolute top-2 right-2 text-[10px] text-muted-foreground">
                    {index + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status line */}
          <p className="text-center text-xs text-muted-foreground min-h-[16px]">
            {won
              ? `+${coinsEarned} XD Coins`
              : claiming
                ? t("game.revealing")
                : opened.length > 0
                  ? t("game.tapNext")
                  : closedBoxes === BOX_COUNT
                    ? ""
                    : t("game.tapNext")}
          </p>

          {won && (
            <Button onClick={handleClose} variant="outline" className="w-full">
              {t("game.continue")}
            </Button>
          )}

          {!won && (
            <p className="text-[10px] text-center text-muted-foreground">
              {t("game.rewardNote")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoinPickGame;
