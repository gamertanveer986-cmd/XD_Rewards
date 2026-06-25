import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";

interface GuestContextType {
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  guestCoins: number;
  addGuestCoins: (amount: number) => void;
  resetGuestCoins: () => void;
}

const STORAGE_KEY = "xd_guest_wallet_v1";

const GuestContext = createContext<GuestContextType>({
  isGuest: false,
  enterGuestMode: () => {},
  exitGuestMode: () => {},
  guestCoins: 0,
  addGuestCoins: () => {},
  resetGuestCoins: () => {},
});

export const useGuest = () => useContext(GuestContext);

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [isGuest, setIsGuest] = useState(false);
  const [guestCoins, setGuestCoins] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(guestCoins));
    } catch {}
  }, [guestCoins]);

  const enterGuestMode = () => setIsGuest(true);
  const exitGuestMode = () => setIsGuest(false);
  const addGuestCoins = useCallback((amount: number) => {
    setGuestCoins(prev => Math.max(0, prev + Math.floor(amount)));
  }, []);
  const resetGuestCoins = useCallback(() => setGuestCoins(0), []);

  return (
    <GuestContext.Provider
      value={{ isGuest, enterGuestMode, exitGuestMode, guestCoins, addGuestCoins, resetGuestCoins }}
    >
      {children}
    </GuestContext.Provider>
  );
};
