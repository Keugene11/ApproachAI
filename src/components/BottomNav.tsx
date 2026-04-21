"use client";

import { Flame, MessageCircle, Users, User, BarChart3, Crown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export type Tab = "checkin" | "coach" | "stats" | "community" | "plans";

interface BottomNavProps {
  active?: Tab;
  onChange?: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof Flame }[] = [
  { id: "checkin", label: "Today", icon: Flame },
  { id: "coach", label: "Wingmate", icon: MessageCircle },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "community", label: "Community", icon: Users },
  { id: "plans", label: "Plans", icon: Crown },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const pathname = usePathname();
  const isProfilePage = pathname === "/profile";

  // Snapshot env(safe-area-inset-bottom) once on mount. Android's gesture nav bar
  // can change this value mid-scroll, which stretches the nav. Lock it in a CSS var.
  useEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(probe);
    const sab = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    document.body.removeChild(probe);
    document.documentElement.style.setProperty("--sab-locked", `${sab}px`);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg border-t border-border z-50 shadow-nav" style={{ transform: "translateZ(0)", willChange: "transform", contain: "layout paint" }}>
      <div className="max-w-md mx-auto flex items-center justify-around py-2 pb-[max(0.5rem,var(--sab-locked,env(safe-area-inset-bottom)))]">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = !isProfilePage && active === id;
          return onChange ? (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 press transition-colors ${
                isActive ? "text-text" : "text-text-muted/50"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ) : (
            <Link
              key={id}
              href={`/?tab=${id}`}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 press text-text-muted/50`}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-0.5 px-4 py-1 press transition-colors ${
            isProfilePage ? "text-text" : "text-text-muted/50"
          }`}
        >
          <User size={20} strokeWidth={isProfilePage ? 2 : 1.5} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
