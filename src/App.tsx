import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GuestProvider } from "@/contexts/GuestContext";
import { lazy, Suspense } from "react";
import Auth from "./pages/Auth";

// Code-split all non-landing routes to reduce initial JS bundle size.
// /auth is the landing route so it stays eagerly imported above.
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Earn = lazy(() => import("./pages/Earn"));
const DailyBonus = lazy(() => import("./pages/DailyBonus"));
const Referral = lazy(() => import("./pages/Referral"));
const Wallet = lazy(() => import("./pages/Wallet"));
const GiftCards = lazy(() => import("./pages/GiftCards"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Support = lazy(() => import("./pages/Support"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Minimal fallback that matches app background to avoid visual flash.
const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-hidden="true" />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GuestProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/earn" element={<Earn />} />
            <Route path="/daily-bonus" element={<DailyBonus />} />
            <Route path="/referral" element={<Referral />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/gift-cards" element={<GiftCards />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/support" element={<Support />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      </GuestProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
