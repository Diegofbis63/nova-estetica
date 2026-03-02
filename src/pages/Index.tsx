import AuraChat from "@/components/AuraChat";
import { Sparkles, Shield, Zap, Brain } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-[#030712] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[300px] bg-purple-600/3 rounded-full blur-[80px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-[0.15em] uppercase bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Aura AI
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-500/40 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            System Active
          </div>
        </header>

        {/* Hero */}
        <section className="text-center px-4 pt-8 pb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-6">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span className="text-[11px] font-mono text-cyan-300/70 uppercase tracking-wider">
              Agente Vendedor Autónomo v2.0
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            <span className="bg-gradient-to-b from-white via-cyan-100 to-cyan-300/60 bg-clip-text text-transparent">
              Inteligencia Artificial
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              de Élite
            </span>
          </h1>
          <p className="text-sm md:text-base text-zinc-500 max-w-lg mx-auto leading-relaxed">
            Califica leads, responde dudas y agenda citas.
            <br className="hidden md:block" />
            Impulsado por IA de última generación.
          </p>
        </section>

        {/* Chat */}
        <section className="px-4 pb-12">
          <AuraChat />
        </section>

        {/* Features */}
        <section className="px-8 pb-16">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Brain,
                title: "IA Conversacional",
                desc: "Agente de ventas autónomo con inteligencia emocional y persuasión premium.",
              },
              {
                icon: Shield,
                title: "Calificación de Leads",
                desc: "Sistema de scoring inteligente que prioriza los prospectos más valiosos.",
              },
              {
                icon: Zap,
                title: "Agenda Automática",
                desc: "Reserva citas automáticamente verificando disponibilidad en tiempo real.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm hover:border-cyan-500/20 transition-all duration-500 group"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all">
                  <f.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2 tracking-wide">
                  {f.title}
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-zinc-900">
          <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.3em]">
            Aura AI — Quantum Neural Engine // Powered by Gemini
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
