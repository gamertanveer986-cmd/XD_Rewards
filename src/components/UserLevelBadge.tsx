import { Star, Zap, Crown, Flame, Award } from "lucide-react";

interface UserLevelBadgeProps {
  totalCoins: number;
  tasksCompleted: number;
  className?: string;
  showDetails?: boolean;
}

const LEVELS = [
  { name: "Starter", minCoins: 0, icon: Star, color: "text-muted-foreground", bg: "bg-muted/50" },
  { name: "Bronze", minCoins: 500, icon: Zap, color: "text-amber-700", bg: "bg-amber-700/20" },
  { name: "Silver", minCoins: 2000, icon: Award, color: "text-gray-400", bg: "bg-gray-400/20" },
  { name: "Gold", minCoins: 5000, icon: Flame, color: "text-yellow-500", bg: "bg-yellow-500/20" },
  { name: "Diamond", minCoins: 15000, icon: Crown, color: "text-primary", bg: "bg-primary/20" },
];

const UserLevelBadge = ({ totalCoins, tasksCompleted, className = "", showDetails = false }: UserLevelBadgeProps) => {
  const currentLevel = [...LEVELS].reverse().find(l => totalCoins >= l.minCoins) || LEVELS[0];
  const currentIndex = LEVELS.indexOf(currentLevel);
  const nextLevel = LEVELS[currentIndex + 1];
  
  const progress = nextLevel
    ? ((totalCoins - currentLevel.minCoins) / (nextLevel.minCoins - currentLevel.minCoins)) * 100
    : 100;

  const Icon = currentLevel.icon;

  if (!showDetails) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${currentLevel.bg} ${className}`}>
        <Icon className={`w-3.5 h-3.5 ${currentLevel.color}`} />
        <span className={`text-xs font-semibold ${currentLevel.color}`}>{currentLevel.name}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl ${currentLevel.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${currentLevel.color}`} />
          </div>
          <div>
            <p className="text-sm font-bold">{currentLevel.name}</p>
            <p className="text-[10px] text-muted-foreground">{tasksCompleted} tasks completed</p>
          </div>
        </div>
        {nextLevel && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Next: {nextLevel.name}</p>
            <p className="text-xs font-semibold">{nextLevel.minCoins - totalCoins} coins to go</p>
          </div>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      
      {/* Level dots */}
      <div className="flex justify-between">
        {LEVELS.map((level, i) => {
          const LevelIcon = level.icon;
          const isReached = i <= currentIndex;
          return (
            <div key={level.name} className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isReached ? level.bg : "bg-muted/30"}`}>
                <LevelIcon className={`w-3 h-3 ${isReached ? level.color : "text-muted-foreground/30"}`} />
              </div>
              <span className={`text-[8px] ${isReached ? "text-foreground" : "text-muted-foreground/40"}`}>{level.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserLevelBadge;
