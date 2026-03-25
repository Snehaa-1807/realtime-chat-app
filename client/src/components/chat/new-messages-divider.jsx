const NewMessagesDivider = ({ count }) => (
  <div className="flex items-center gap-3 my-3 px-4">
    <div className="flex-1 h-px bg-primary/40" />
    <span className="text-xs text-primary font-medium bg-primary/10 px-3 py-0.5 rounded-full border border-primary/30 shrink-0">
      {count} new {count === 1 ? "message" : "messages"} ↓
    </span>
    <div className="flex-1 h-px bg-primary/40" />
  </div>
);

export default NewMessagesDivider;