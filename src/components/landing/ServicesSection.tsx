import ScrollReveal from "./ScrollReveal";
import ServiceCard from "./ServiceCard";

import serviceFacial from "@/assets/service-facial.jpg";
import serviceHialuronico from "@/assets/service-hialuronico.jpg";
import serviceBotox from "@/assets/service-botox.jpg";
import servicePeeling from "@/assets/service-peeling.jpg";
import serviceMicroblading from "@/assets/service-microblading.jpg";
import serviceMasaje from "@/assets/service-masaje.jpg";

const services = [
  { name: "Limpieza Facial Profunda", price: "$45", duration: "60 min", desc: "Extracción, exfoliación enzimática y mascarilla revitalizante.", image: serviceFacial },
  { name: "Ácido Hialurónico", price: "$280", duration: "45 min", desc: "Relleno dérmico premium para labios, pómulos y surcos.", image: serviceHialuronico },
  { name: "Botox Preventivo", price: "$220", duration: "30 min", desc: "Toxina botulínica para líneas de expresión y frente.", image: serviceBotox },
  { name: "Peeling Químico", price: "$95", duration: "45 min", desc: "Renovación celular con ácidos glicólico y mandélico.", image: servicePeeling },
  { name: "Microblading Cejas", price: "$180", duration: "90 min", desc: "Diseño hiperrealista pelo a pelo con pigmentos premium.", image: serviceMicroblading },
  { name: "Masaje Relajante", price: "$55", duration: "60 min", desc: "Masaje descontracturante con aromaterapia y piedras calientes.", image: serviceMasaje },
];

const ServicesSection = () => {
  return (
    <section id="servicios" className="px-4 md:px-8 pb-20">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-12">
            <p className="text-xs font-sans uppercase tracking-[0.2em] text-gold/60 mb-3">Nuestros Tratamientos</p>
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-cream mb-3">
              Servicios Premium
            </h2>
            <p className="text-sm text-cream/40 font-sans max-w-md mx-auto">
              Cada tratamiento es una experiencia personalizada diseñada para resultados extraordinarios.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s, i) => (
            <ScrollReveal key={i} delay={i * 0.08}>
              <ServiceCard {...s} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
