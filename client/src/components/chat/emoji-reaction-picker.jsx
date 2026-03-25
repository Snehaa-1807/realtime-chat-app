import { useState } from "react";
import { cn } from "@/lib/utils";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const EmojiReactionPicker = ({ onSelect, className }) => {
  const [hovered, setHovered] = useState(null);

  return (
    <div
      className={cn(
        "flex items-center gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-lg",
        className
      )}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          onMouseEnter={() => setHovered(emoji)}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            "text-lg transition-transform duration-100 select-none",
            hovered === emoji ? "scale-150" : "scale-100"
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default EmojiReactionPicker;