import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import AppHeader from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
  showAdmin?: boolean;
  showLogout?: boolean;
  onLogout?: () => void;
  hideNav?: boolean;
}

const AppLayout = ({ 
  children, 
  title, 
  showBack = false, 
  showAdmin = false, 
  showLogout = false,
  onLogout,
  hideNav = false 
}: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader 
        title={title} 
        showBack={showBack} 
        showAdmin={showAdmin}
        showLogout={showLogout}
        onLogout={onLogout}
      />
      
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>
      
      {!hideNav && <BottomNav />}
    </div>
  );
};

export default AppLayout;
