import { Link } from "react-router-dom";
import AuraChat from "@/components/AuraChat";
import { Sparkles, Shield, Zap, Brain, LogIn, Star, Clock, MapPin, Phone, Instagram, ChevronRight } from "lucide-react";

const services = [
  { name: "Limpieza Facial Profunda", price: "$45", duration: "60 min", desc: "Extracción, exfoliación enzimática y mascarilla revitalizante." },
  { name: "Ácido Hialurónico", price: "$280", duration: "45 min", desc: "Relleno dérmico premium para labios, pómulos y surcos." },
  { name: "Botox Preventivo", price: "$220", duration: "30 min", desc: "Toxina botulínica para líneas de expresión y frente." },
  { name: "Peeling Químico", price: "$95", duration: "45 min", desc: "Renovación celular con ácidos glicólico y mandélico." },
  { name: "Microblading Cejas", price: "$180", duration: "90 min", desc: "Diseño hiperrealista pelo a pelo con pigmentos premium." },
  { name: "Masaje Relajante", price: "$55", duration: "60 min", desc: "Masaje descontracturante con aromaterapia y piedras calientes." },
];

const testimonials = [
  { name: "Valentina M.", text: "El mejor centro de estética al que he ido. El tratamiento de ácido hialurónico quedó increíble y súper natural.", rating: 5 },
  { name: "Carolina R.", text: "Me encanta que puedo agendar por el chat a cualquier hora. La limpieza facial profunda es espectacular.", rating: 5 },
  { name: "Lucía G.", text: "Profesionales de primer nivel. El microblading superó todas mis expectativas. ¡Lo recomiendo 100%!", rating: 5 },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-[#030712] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[300px] bg-purple-600/3 rounded-full blur-[80px]" />
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
        <header className="flex items-center justify-between px-6 md:px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-[0.12em] uppercase bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                NOVA Estética
              </span>
              <p className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase">Centro de Belleza Premium</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="#servicios" className="hidden md:block text-[11px] text-zinc-400 hover:text-cyan-300 transition-colors font-mono uppercase tracking-wider">
              Servicios
            </a>
            <a href="#chat" className="hidden md:block text-[11px] text-zinc-400 hover:text-cyan-300 transition-colors font-mono uppercase tracking-wider">
              Agendar
            </a>
            <Link
              to="/auth"
              className="flex items-center gap-2 text-xs font-mono text-cyan-400/70 hover:text-cyan-300 border border-cyan-500/20 rounded-lg px-3 py-1.5 hover:bg-cyan-500/5 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="text-center px-4 pt-10 pb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-6">
            <Star className="w-3 h-3 text-cyan-400" />
            <span className="text-[11px] font-mono text-cyan-300/70 uppercase tracking-wider">
              +500 clientes satisfechos — ⭐ 4.9 en Google
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-5">
            <span className="bg-gradient-to-b from-white via-cyan-100 to-cyan-300/60 bg-clip-text text-transparent">
              Tu Belleza,
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Nuestra Ciencia
            </span>
          </h1>
          <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed mb-8">
            Centro de estética avanzada con los mejores profesionales y tecnología de última generación.
            <br className="hidden md:block" />
            Agenda tu cita en segundos con nuestra asistente virtual.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#chat"
              className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] text-sm"
            >
              Agendar Cita con IA
              <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="#servicios"
              className="inline-flex items-center gap-2 border border-zinc-700 hover:border-cyan-500/30 text-zinc-300 hover:text-white px-6 py-3 rounded-xl transition-all text-sm"
            >
              Ver Servicios
            </a>
          </div>
        </section>

        {/* Info bar */}
        <section className="px-4 pb-12">
          <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 text-zinc-500 text-xs font-mono">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-cyan-500/50" />
              Av. Libertador 1234, Buenos Aires
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-500/50" />
              Lun–Sáb 9:00–20:00
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-cyan-500/50" />
              +54 11 5555-1234
            </div>
            <div className="flex items-center gap-2">
              <Instagram className="w-3.5 h-3.5 text-cyan-500/50" />
              @nova.estetica
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="servicios" className="px-4 md:px-8 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Nuestros Servicios
              </h2>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Tratamientos premium con resultados garantizados</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((s, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm hover:border-cyan-500/20 transition-all duration-500 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white tracking-wide">{s.name}</h3>
                    <span className="text-lg font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{s.price}</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-3">{s.desc}</p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-500/50">
                    <Clock className="w-3 h-3" />
                    {s.duration}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why us */}
        <section className="px-4 md:px-8 pb-16">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Brain, title: "Profesionales Certificados", desc: "Equipo médico con más de 10 años de experiencia en estética avanzada." },
              { icon: Shield, title: "Productos Premium", desc: "Trabajamos con marcas líderes: Allergan, Teoxane, SkinCeuticals." },
              { icon: Zap, title: "Agendamiento con IA", desc: "Reserva tu cita 24/7 con nuestra asistente virtual impulsada por IA." },
            ].map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm hover:border-cyan-500/20 transition-all duration-500 group"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all">
                  <f.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2 tracking-wide">{f.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-4 md:px-8 pb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-center mb-6 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Lo que dicen nuestros clientes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testimonials.map((t, i) => (
                <div key={i} className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-3 italic">"{t.text}"</p>
                  <p className="text-[11px] text-cyan-400/70 font-semibold">{t.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Chat CTA */}
        <section id="chat" className="px-4 pb-6">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-2 bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Agenda tu cita ahora
            </h2>
            <p className="text-xs text-zinc-500">Habla con nuestra asistente virtual. Disponible 24/7.</p>
          </div>
          <AuraChat />
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-zinc-900 space-y-2">
          <p className="text-xs text-zinc-600">
            NOVA Estética — Av. Libertador 1234, Buenos Aires — +54 11 5555-1234
          </p>
          <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.3em]">
            Powered by Aura AI — Agente Vendedor Autónomo
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
