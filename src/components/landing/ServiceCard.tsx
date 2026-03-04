import { Clock } from "lucide-react";

interface ServiceCardProps {
  name: string;
  price: string;
  duration: string;
  desc: string;
  image: string;
}

const ServiceCard = ({ name, price, duration, desc, image }: ServiceCardProps) => {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm hover:border-cyan-500/20 transition-all duration-500 group overflow-hidden">
      <div className="h-48 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-semibold text-white tracking-wide">{name}</h3>
          <span className="text-lg font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{price}</span>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed mb-3">{desc}</p>
        <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-500/50">
          <Clock className="w-3 h-3" />
          {duration}
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
