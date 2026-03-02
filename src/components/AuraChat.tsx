import { useState, useRef, useEffect } from "react";
import { Bot, Send, AlertTriangle, Sparkles } from "lucide-react";
import { streamAuraChat } from "@/lib/aura-chat";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

export default function AuraChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;

    setError(null);
    const userMsg: Msg = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    await streamAuraChat({
      messages: [...messages, userMsg],
      onDelta: (chunk) => upsertAssistant(chunk),
      onDone: () => setIsLoading(false),
      onError: (err) => {
        setError(err);
        setIsLoading(false);
      },
    });
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.15)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-blue-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-[0.2em] uppercase">
              Aura Virtual Core
            </h3>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isLoading ? "bg-amber-400" : "bg-cyan-400"
                }`}
              />
              <span className="text-[10px] text-cyan-300/60 font-mono uppercase tracking-tighter">
                {isLoading ? "Processing..." : "Online"}
              </span>
            </div>
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-cyan-500/40" />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent"
      >
        {messages.length === 0 && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
            <div className="p-4 rounded-full border border-cyan-500/20 bg-cyan-500/5">
              <Bot className="w-10 h-10 text-cyan-400/50" />
            </div>
            <p className="text-xs text-cyan-300 font-mono uppercase tracking-[0.25em]">
              Standby for synchronization...
            </p>
            <p className="text-[10px] text-cyan-300/40 max-w-xs">
              Soy Aura, tu agente de ventas de élite. Pregúntame lo que necesites.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            } animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-50 rounded-tr-sm"
                  : "bg-zinc-900/80 border border-zinc-700/50 text-zinc-300 rounded-tl-sm ring-1 ring-cyan-500/10"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-zinc-900/50 border border-zinc-800 px-4 py-3 rounded-2xl flex gap-1.5">
              <div className="w-2 h-2 bg-cyan-500/60 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-cyan-500/60 rounded-full animate-bounce [animation-delay:0.15s]" />
              <div className="w-2 h-2 bg-cyan-500/60 rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-black/60 border-t border-cyan-500/10">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-3 bg-zinc-900/60 border border-cyan-500/20 rounded-xl p-1.5 focus-within:border-cyan-500/40 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all duration-300"
        >
          <input
            className="flex-1 bg-transparent border-none text-white text-sm px-3 py-1 focus:outline-none focus:ring-0 placeholder:text-zinc-600 disabled:opacity-50"
            value={input}
            placeholder="Escribe tu mensaje..."
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition-all active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-2 text-[8px] text-center font-mono text-zinc-700 uppercase tracking-[0.3em]">
          Quantum Encryption Enabled // Aura Protocol v2.0
        </div>
      </div>
    </div>
  );
}
