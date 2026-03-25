import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ScrollToBottomButton = ({ onClick, unreadCount, visible }) => {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-24 right-8 z-50",
        "bg-card border border-border shadow-lg rounded-full",
        "flex items-center justify-center",
        "w-10 h-10 transition-all hover:bg-muted hover:scale-110",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
    >
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      <ChevronDown size={18} className="text-muted-foreground" />
    </button>
  );
};

export default ScrollToBottomButton;