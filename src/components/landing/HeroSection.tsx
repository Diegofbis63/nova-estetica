import { motion } from "framer-motion";
import { ChevronRight, Star } from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import heroBg from "@/assets/nova-hero.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center px-4 overflow-hidden pt-20 md:pt-0">
      <div className="absolute inset-0 -z-10">
        <img
          src={heroBg}
          alt="Nova Estética Hero"
          className="w-full h-full object-cover object-[75%] md:object-center"
        />
        {/* Sophisticated gradient to guarantee text sharpness: Vertical on mobile, horizontal on desktop */}
        <div className="absolute inset-0 bg-gradient-to-b from-noir/60 via-noir/20 to-noir/80 md:bg-gradient-to-r md:from-noir/80 md:via-noir/40 md:to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto w-full">
        <div className="max-w-2xl">


          <ScrollReveal delay={0.1} direction="left">
            <h1 className="text-5xl md:text-8xl lg:text-9xl font-serif font-bold tracking-tight mb-8 leading-[0.95] drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]">
              <span className="text-white block">Tu Belleza,</span>
              <span className="bg-gradient-to-r from-gold via-gold-light to-gold-light bg-clip-text text-transparent italic">
                Nuestra Pasión
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.2} direction="left">
            <p className="text-lg md:text-2xl text-white font-sans max-w-xl mb-14 leading-relaxed drop-shadow-[0_4px_4px_rgba(0,0,0,1)] font-medium">
              Descubre un espacio donde la ciencia y el arte se unen para realzar
              tu belleza natural. Tratamientos personalizados con resultados excepcionales.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.3} direction="left">
            <div className="flex flex-wrap items-center gap-6">
              <motion.a
                href="#chat"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-gold to-gold-light text-noir font-sans font-black px-12 py-5 rounded-full shadow-2xl transition-all text-base tracking-wide"
                whileHover={{ scale: 1.05, boxShadow: "0 0 35px rgba(212, 175, 55, 0.6)" }}
                whileTap={{ scale: 0.97 }}
              >
                Agendar Cita
                <ChevronRight className="w-5 h-5" />
              </motion.a>
              <motion.a
                href="#servicios"
                className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl border-2 border-white/30 hover:border-gold/60 text-white px-12 py-5 rounded-full transition-all text-base font-sans font-bold shadow-xl shadow-noir/40"
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.97 }}
              >
                Ver Tratamientos
              </motion.a>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
