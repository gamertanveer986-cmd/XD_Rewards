import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import AppLayout from "@/components/AppLayout";
import {
  Globe, Volume2, VolumeX, LifeBuoy, ShieldCheck, FileText, ChevronRight,
  LogOut, BadgeCheck, Coins, Lock, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n, { LANGUAGE_STORAGE_KEY } from "@/i18n";

const SOUND_KEY = "xd_sound_enabled";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
];

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [language, setLanguage] = useState(i18n.language || "en");
  const [openPolicy, setOpenPolicy] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      try {
        setSoundEnabled(localStorage.getItem(SOUND_KEY) !== "0");
        setLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY) || i18n.language || "en");
      } catch {/* ignore */}
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("settings.signedOut"));
    navigate("/auth");
  };

  const toggleSound = (v: boolean) => {
    setSoundEnabled(v);
    try { localStorage.setItem(SOUND_KEY, v ? "1" : "0"); } catch {/* ignore */}
  };

  const changeLanguage = async (code: string) => {
    setLanguage(code);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, code); } catch {/* ignore */}
    await i18n.changeLanguage(code);
    toast.success(i18n.t("settings.languageSaved"));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout title={t("settings.title")}>
      <div className="px-4 py-5 space-y-5">
        {/* Language */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground px-1 mb-2">{t("settings.language")}</h2>
          <Card className="p-4 surface-elevated border-border">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium">{t("settings.appLanguage")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => changeLanguage(l.code)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    language === l.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Card>
        </section>

        {/* Sound */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground px-1 mb-2">{t("settings.preferences")}</h2>
          <Card className="p-4 surface-elevated border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-primary" />
                ) : (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">{t("settings.soundEffects")}</p>
                  <p className="text-xs text-muted-foreground">
                    {soundEnabled ? t("settings.soundOn") : t("settings.soundOff")}
                  </p>
                </div>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
            </div>
          </Card>
        </section>

        {/* Help & Support */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground px-1 mb-2">{t("settings.help")}</h2>
          <Card className="surface-elevated border-border divide-y divide-border overflow-hidden">
            <button
              onClick={() => navigate("/support")}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LifeBuoy className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t("settings.helpSupport")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <a
              href="mailto:dxreward@gmail.com?subject=XD%20Rewards%20Feedback"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t("settings.sendFeedback")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
          </Card>
        </section>


        {/* Policies */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground px-1 mb-2">
            Privacy & Policy
          </h2>
          <Card className="surface-elevated border-border divide-y divide-border overflow-hidden">
            {/* Transparency */}
            <PolicyItem
              icon={<BadgeCheck className="w-5 h-5 text-primary" />}
              label="Transparency Promise"
              open={openPolicy === "transparency"}
              onToggle={() => setOpenPolicy(openPolicy === "transparency" ? null : "transparency")}
            >
              <p>
                XD Rewards is a 100% transparent and verified platform. We are committed to honesty and
                provide clear, fair earning opportunities for our users. You can trust our process, as every
                reward is verified and processed with full integrity.
              </p>
            </PolicyItem>

            {/* Redeem Rules */}
            <PolicyItem
              icon={<Coins className="w-5 h-5 text-primary" />}
              label="Reward & Redeem Rules"
              open={openPolicy === "redeem"}
              onToggle={() => setOpenPolicy(openPolicy === "redeem" ? null : "redeem")}
            >
              <ul className="space-y-1">
                <li>• Conversion: <strong className="text-foreground">1000 XD Coins = ₹10 INR</strong></li>
                <li>• Minimum Withdrawal: <strong className="text-foreground">₹50 INR (5000 XD Coins)</strong></li>
                <li>• Rewards are processed within 48 hours after manual verification.</li>
              </ul>
            </PolicyItem>

            {/* Terms */}
            <PolicyItem
              icon={<FileText className="w-5 h-5 text-primary" />}
              label="Terms of Service"
              open={openPolicy === "terms"}
              onToggle={() => setOpenPolicy(openPolicy === "terms" ? null : "terms")}
            >
              <ul className="space-y-1">
                <li>• XD Rewards is 100% free — no deposit or payment is ever required.</li>
                <li>• Rewards are paid in ₹ INR after manual verification.</li>
                <li>• Each user may register one verified account per mobile device.</li>
                <li>• Bots, automation, or fraudulent activity will result in suspension.</li>
              </ul>
            </PolicyItem>

            {/* Privacy */}
            <PolicyItem
              icon={<Lock className="w-5 h-5 text-primary" />}
              label="Privacy Policy"
              open={openPolicy === "privacy"}
              onToggle={() => setOpenPolicy(openPolicy === "privacy" ? null : "privacy")}
            >
              <ul className="space-y-1">
                <li>• We collect only the data needed to operate the platform.</li>
                <li>• Your email is used for secure authentication only.</li>
                <li>• We never sell or share personal data with third parties.</li>
                <li>• All data is stored with encryption and strict access controls.</li>
              </ul>
            </PolicyItem>

            {/* Integrity */}
            <PolicyItem
              icon={<ShieldCheck className="w-5 h-5 text-primary" />}
              label="Reward Integrity"
              open={openPolicy === "integrity"}
              onToggle={() => setOpenPolicy(openPolicy === "integrity" ? null : "integrity")}
            >
              <p>
                Every payout is checked by our integrity team for full transparency. Rewards are processed
                within 48 hours after manual verification of tasks.
              </p>
            </PolicyItem>

            {/* Full legal doc */}
            <a
              href="https://docs.google.com/document/d/1YrPSE23jfwKsz7h5PK7nrFqgqG2D6HOt6MlB0cJINPA/edit?usp=drivesdk"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Full Legal Document</span>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </Card>
        </section>

        {/* Logout */}
        <section className="pt-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t("settings.logout")}
          </Button>
        </section>

        <p className="text-[10px] text-muted-foreground text-center pt-2">
          XD Rewards · v1.0 · Transparent · Verified · Secure
        </p>
      </div>
    </AppLayout>
  );
};

const PolicyItem = ({
  icon,
  label,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
    </button>
    {open && (
      <div className="px-4 pb-4 pt-0 text-xs text-muted-foreground leading-relaxed">
        {children}
      </div>
    )}
  </div>
);

export default Settings;
