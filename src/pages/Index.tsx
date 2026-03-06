import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import NovaChat from "@/components/NovaChat";
import ScrollReveal from "@/components/landing/ScrollReveal";
import HeroSection from "@/components/landing/HeroSection";
import ServicesSection from "@/components/landing/ServicesSection";
import GallerySection from "@/components/landing/GallerySection";
import WhyUsSection from "@/components/landing/WhyUsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FloatingChat from "@/components/FloatingChat";
import { LogIn, MapPin, Phone, Instagram, Clock, Mail } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-noir text-cream relative overflow-hidden">
      {/* Subtle warm ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gold/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-rose/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-12 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center" role="img" aria-label="Logo de NOVA Estética">
              <span className="text-noir font-serif font-bold text-lg">N</span>
            </div>
            <div>
              <span className="text-xl font-serif font-bold tracking-[0.15em] text-cream">
                NOVA Estética
              </span>
              <p className="text-[11px] font-sans text-cream/60 tracking-[0.2em] uppercase">Centro de Belleza Premium</p>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#servicios" className="hidden md:block text-[11px] text-cream/50 hover:text-gold transition-colors font-sans uppercase tracking-[0.15em]">
              Servicios
            </a>
            <a href="#galeria" className="hidden md:block text-[11px] text-cream/50 hover:text-gold transition-colors font-sans uppercase tracking-[0.15em]">
              Resultados
            </a>
            <a href="#chat" className="hidden md:block text-[11px] text-cream/50 hover:text-gold transition-colors font-sans uppercase tracking-[0.15em]">
              Agendar
            </a>
            <Link
              to="/auth"
              className="flex items-center gap-2 text-xs font-sans text-gold/70 hover:text-gold border border-gold/20 rounded-full px-4 py-1.5 hover:bg-gold/5 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </nav>
        </header>

        <HeroSection />

        {/* Info bar */}
        <ScrollReveal className="px-4 pb-16">
          <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-12 text-cream/80 text-sm md:text-base font-sans font-medium">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gold" />
              Av. Libertador 1234, Buenos Aires
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gold" />
              Lun–Sáb 9:00–20:00
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gold" />
              +54 11 5555-1234
            </div>
            <div className="flex items-center gap-3">
              <Instagram className="w-5 h-5 text-gold" />
              @nova.estetica
            </div>
          </div>
        </ScrollReveal>

        <ServicesSection />
        <GallerySection />
        <WhyUsSection />
        <TestimonialsSection />

        {/* Chat CTA */}
        <ScrollReveal>
          <section id="chat" className="px-4 pb-8">
            <div className="text-center mb-8">
              <p className="text-xs font-sans uppercase tracking-[0.2em] text-gold/60 mb-3">Reserva Online</p>
              <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3 text-cream">
                Agenda tu cita ahora
              </h2>
              <p className="text-sm text-cream/40 font-sans max-w-md mx-auto">
                Habla con nuestra asistente virtual. Disponible las 24 horas, los 7 días de la semana.
              </p>
            </div>
            <NovaChat />
          </section>
        </ScrollReveal>

        {/* Footer */}
        <footer className="border-t border-cream/10 mt-8">
          <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            <div>
              <h4 className="font-serif text-lg font-bold text-cream mb-4">NOVA Estética</h4>
              <p className="text-sm text-cream/50 leading-relaxed font-sans">
                Centro de belleza premium con los mejores profesionales y tecnología de última generación en Buenos Aires.
              </p>
            </div>
            <div>
              <h4 className="font-serif text-lg font-bold text-cream mb-4">Contacto</h4>
              <div className="space-y-3 text-sm text-cream/50 font-sans">
                <p className="flex items-center justify-center md:justify-start gap-3"><MapPin className="w-4 h-4 text-gold/60" /> Av. Libertador 1234, Buenos Aires</p>
                <p className="flex items-center justify-center md:justify-start gap-3"><Phone className="w-4 h-4 text-gold/60" /> +54 11 5555-1234</p>
                <p className="flex items-center justify-center md:justify-start gap-3"><Mail className="w-4 h-4 text-gold/60" /> hola@novaestetica.com</p>
              </div>
            </div>
            <div>
              <h4 className="font-serif text-lg font-bold text-cream mb-4">Horarios</h4>
              <div className="space-y-2 text-sm text-cream/50 font-sans">
                <p className="flex items-center justify-center md:justify-start gap-2"><Clock className="w-4 h-4 text-gold/60" /> Lunes a Viernes: 9:00 – 20:00</p>
                <p className="flex items-center justify-center md:justify-start gap-2"><Clock className="w-4 h-4 text-gold/60" /> Sábados: 9:00 – 18:00</p>
                <p className="flex items-center justify-center md:justify-start gap-2 text-rose/60"><Clock className="w-4 h-4 opacity-50" /> Domingos: Cerrado</p>
              </div>
            </div>
          </div>
          <div className="text-center py-6 border-t border-cream/5">
            <p className="text-[10px] font-sans text-cream/20 uppercase tracking-[0.3em]">
              © 2026 NOVA Estética — Todos los derechos reservados
            </p>
          </div>
        </footer>
        <FloatingChat />
      </div>
    </div>
  );
};

export default Index;
