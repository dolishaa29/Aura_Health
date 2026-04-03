import React from "react";
import { MessageCircle } from "lucide-react";

/**
 * Simple chat box: message list + input. Parent owns state via props.
 */
const ChatPanel = ({
  title = "Messages",
  hint,
  messages,
  currentUserId,
  chatInput,
  onChatInputChange,
  onSend,
  disabled,
  inputPlaceholder,
  className = ""
}) => {
  return (
    <section
      className={`rounded-3xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col min-h-[280px] ${className}`.trim()}
    >
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-emerald-400" />
        {title}
      </h2>
      {hint && <p className="text-sm text-slate-500 mb-3">{hint}</p>}
      <div className="flex-1 border border-slate-800 rounded-xl p-3 mb-3 overflow-y-auto max-h-64 space-y-2 text-sm">
        {messages.length === 0 && (
          <p className="text-slate-600 text-xs">No messages yet.</p>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.fromUserId === currentUserId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`px-3 py-2 rounded-2xl max-w-[85%] ${
                m.fromUserId === currentUserId
                  ? "bg-emerald-500 text-slate-950 rounded-br-md"
                  : "bg-slate-800 text-slate-100 rounded-bl-md"
              }`}
            >
              <p>{m.message}</p>
              <p className="text-[10px] mt-1 opacity-70">
                {new Date(m.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder={inputPlaceholder}
          disabled={disabled}
          className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm focus:border-emerald-500/50"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !chatInput.trim()}
          className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 text-sm font-medium disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </section>
  );
};

export default ChatPanel;
