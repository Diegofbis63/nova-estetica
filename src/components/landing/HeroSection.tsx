import { motion } from "framer-motion";
import { ChevronRight, Star } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative text-center px-4 pt-8 pb-16 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={heroBg} alt="Interior de la clínica NOVA Estética" className="w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-noir/50 via-noir/70 to-noir" />
      </div>

      <ScrollReveal>
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gold/20 bg-gold/5 mb-8">
          <Star className="w-3 h-3 text-gold" />
          <span className="text-[11px] font-sans text-gold/80 uppercase tracking-[0.15em]">
            +500 clientes satisfechos — ⭐ 4.9 en Google
          </span>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight mb-6 leading-[1.1]">
          <span className="text-cream">Tu Belleza,</span>
          <br />
          <span className="bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent italic">
            Nuestra Pasión
          </span>
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <p className="text-sm md:text-base text-cream/50 max-w-lg mx-auto leading-relaxed mb-10 font-sans">
          Descubre un espacio donde la ciencia y el arte se unen para realzar
          tu belleza natural. Tratamientos personalizados con resultados excepcionales.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.3}>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <motion.a
            href="#chat"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-gold to-gold-light text-noir font-sans font-bold px-8 py-3.5 rounded-full transition-all text-sm tracking-wide"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            Agendar Cita
            <ChevronRight className="w-4 h-4" />
          </motion.a>
          <motion.a
            href="#servicios"
            className="inline-flex items-center gap-2 border border-cream/20 hover:border-gold/40 text-cream/70 hover:text-cream px-8 py-3.5 rounded-full transition-all text-sm font-sans"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            Ver Tratamientos
          </motion.a>
        </div>
      </ScrollReveal>
    </section>
  );
};

export default HeroSection;
