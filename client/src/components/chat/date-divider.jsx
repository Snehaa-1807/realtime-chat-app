import { format, isToday, isYesterday } from "date-fns";

const DateDivider = ({ date }) => {
  const getLabel = () => {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEEE, MMMM d");
  };

  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border shrink-0">
        {getLabel()}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};

export default DateDivider;