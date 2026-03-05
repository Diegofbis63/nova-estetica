import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Users, CalendarCheck, TrendingUp, ArrowLeft, RefreshCw, Plus, Trash2, Edit, Upload, Image as ImageIcon } from "lucide-react";

interface Lead {
  id: string;
  client_name: string;
  contact_info: {
    email?: string;
    phone?: string;
  };
  status: string;
  intent_score: number;
  created_at: string;
}

interface Appointment {
  id: string;
  service_type: string;
  date_time: string;
  status: string;
  created_at: string;
}

interface Service {
  id: string;
  title: string;
  description: string;
  price: string;
  duration: string;
  image_url: string;
  active: boolean;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState<'leads' | 'services'>('leads');

  // Service form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service>>({});

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth');
        const data = await res.json();
        if (!res.ok) {
          navigate("/auth");
          return;
        }
        setUserName(data.user.email);
        await fetchData();
      } catch (e) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, servicesRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/services')
      ]);

      if (dashboardRes.ok) {
        const dashData = await dashboardRes.json();
        setLeads(dashData.leads || []);
        setAppointments(dashData.appointments || []);
      }
      if (servicesRes.ok) {
        const servData = await servicesRes.json();
        setServices(servData.services || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    navigate("/auth");
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const method = currentService.id ? 'PUT' : 'POST';
    try {
      await fetch('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentService)
      });
      setIsEditing(false);
      setCurrentService({});
      await fetchData();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este servicio?')) return;
    setLoading(true);
    try {
      await fetch(`/api/services?id=${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentService({ ...currentService, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const avgIntent = leads.length > 0
    ? Math.round(leads.reduce((sum, l) => sum + (l.intent_score || 0), 0) / leads.length)
    : 0;
  const scheduledCount = appointments.filter(a => a.status === "scheduled").length;

  const stats = [
    { icon: Users, label: "Total Leads", value: leads.length, color: "text-gold" },
    { icon: CalendarCheck, label: "Citas Agendadas", value: scheduledCount, color: "text-gold" },
    { icon: TrendingUp, label: "Intent Score Prom.", value: `${avgIntent}%`, color: "text-gold" },
  ];

  return (
    <div className="min-h-screen bg-noir text-cream">
      <div className="fixed inset-0 pointer-events-none opacity-50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gold/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        <header className="flex flex-col md:flex-row items-center justify-between px-6 py-5 border-b border-cream/5 gap-4 backdrop-blur-xl bg-noir/50 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="text-cream/30 hover:text-gold transition-colors p-1"
              title="Volver al sitio"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg">
                <span className="text-noir font-serif font-bold text-sm">N</span>
              </div>
              <div>
                <span className="text-xs font-serif font-bold tracking-[0.2em] uppercase text-cream">
                  NOVA Estética
                </span>
                <p className="text-[9px] text-cream/20 font-sans tracking-wide">Panel Administrativo • {userName}</p>
              </div>
            </div>
          </div>

          <div className="flex bg-noir-light/60 p-1 rounded-full border border-cream/5 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-5 py-1.5 text-xs font-sans uppercase tracking-widest rounded-full transition-all ${activeTab === 'leads' ? 'bg-gold text-noir font-bold shadow-lg' : 'text-cream/40 hover:text-cream'}`}
            >
              Gestión de Leads
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-5 py-1.5 text-xs font-sans uppercase tracking-widest rounded-full transition-all ${activeTab === 'services' ? 'bg-gold text-noir font-bold shadow-lg' : 'text-cream/40 hover:text-cream'}`}
            >
              Catálogo
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-cream/40 hover:text-gold transition-colors border border-cream/5 rounded-full px-4 py-2 hover:bg-gold/5"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              <span className="mt-0.5">Actualizar</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-cream/40 hover:text-rose transition-colors border border-cream/5 rounded-full px-4 py-2 hover:bg-rose/5"
            >
              <LogOut className="w-3 h-3" />
              <span className="mt-0.5">Salir</span>
            </button>
          </div>
        </header>

        {activeTab === 'leads' ? (
          <div className="max-w-7xl mx-auto px-6 py-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {stats.map((s, i) => (
                <div key={i} className="group p-6 rounded-2xl border border-cream/5 bg-noir-light/30 backdrop-blur-sm hover:border-gold/20 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-gold/5 flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <span className="text-[10px] text-cream/30 font-sans uppercase tracking-widest">{s.label}</span>
                  </div>
                  <p className="text-4xl font-serif font-bold text-cream group-hover:text-gold transition-colors">
                    {loading ? "..." : s.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-gold rounded-full" />
                <h3 className="text-lg font-serif font-bold text-cream tracking-tight">
                  Clientes Potenciales y Conversaciones
                </h3>
              </div>
              <div className="rounded-2xl border border-cream/5 bg-noir-light/20 overflow-hidden shadow-2xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-noir-light/40 text-cream/30 text-[10px] font-sans uppercase tracking-[0.2em] border-b border-cream/5">
                      <th className="text-left px-6 py-5">Cliente</th>
                      <th className="text-left px-6 py-5">Información</th>
                      <th className="text-left px-6 py-5">Estado</th>
                      <th className="text-left px-6 py-5">Interés (AI)</th>
                      <th className="text-left px-6 py-5">Registrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream/5">
                    {loading ? (
                      <tr><td colSpan={5} className="px-6 py-20 text-center text-cream/20 font-sans italic">Analizando registros premium...</td></tr>
                    ) : leads.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-20 text-center text-cream/20 font-sans italic">Aún no hay interacciones registradas. Nova está lista para recibir clientes.</td></tr>
                    ) : leads.map((l, idx) => {
                      const displayContact = l.contact_info?.email || l.contact_info?.phone || "Sin contacto";
                      return (
                        <tr key={l.id || idx} className="hover:bg-cream/[0.02] transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-cream font-serif font-bold text-md">{l.client_name}</span>
                              <span className="text-[10px] text-gold/50 font-sans uppercase tracking-wider">Lead Identificado</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-cream/50 text-xs font-sans tracking-wide">{displayContact}</span>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`text-[9px] font-sans font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${l.status === "qualified" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                              l.status === "contacted" ? "text-amber-400 border-amber-500/20 bg-amber-500/5" :
                                "text-cream/40 border-cream/10 bg-cream/5"
                              }`}>
                              {l.status === "qualified" ? "Interés Alto" : l.status === "contacted" ? "En Gestión" : "Nuevo"}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-1.5 rounded-full bg-noir overflow-hidden border border-cream/5">
                                <div
                                  className={`h-full transition-all duration-1000 ${(l.intent_score || 0) >= 70 ? "bg-gold" :
                                    (l.intent_score || 0) >= 40 ? "bg-gold/60" :
                                      "bg-cream/20"
                                    }`}
                                  style={{ width: `${l.intent_score || 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gold font-bold font-sans">{l.intent_score || 0}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-cream/30 text-xs font-sans">
                            {l.created_at ? new Date(l.created_at).toLocaleDateString("es-AR") : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-gold rounded-full" />
                <h3 className="text-lg font-serif font-bold text-cream tracking-tight">
                  Próximas Citas Agendadas
                </h3>
              </div>
              <div className="rounded-2xl border border-cream/5 bg-noir-light/20 overflow-hidden shadow-2xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-noir-light/40 text-cream/30 text-[10px] font-sans uppercase tracking-[0.2em] border-b border-cream/5">
                      <th className="text-left px-6 py-5">Servicio</th>
                      <th className="text-left px-6 py-5">Fecha y Horario</th>
                      <th className="text-left px-6 py-5">Estado</th>
                      <th className="text-left px-6 py-5">Registrada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream/5">
                    {loading ? (
                      <tr><td colSpan={4} className="px-6 py-20 text-center text-cream/20 font-sans italic">Organizando agenda premium...</td></tr>
                    ) : appointments.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-20 text-center text-cream/20 font-sans italic">Nova está esperando para agendar el próximo tratamiento.</td></tr>
                    ) : appointments.map((a) => (
                      <tr key={a.id} className="hover:bg-cream/[0.02] transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-gold" />
                            <span className="text-cream font-serif font-bold text-md">{a.service_type || "Tratamiento Geral"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-cream/60 text-xs font-sans tracking-wide font-bold uppercase">
                            {new Date(a.date_time).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                            {" • "}
                            {new Date(a.date_time).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`text-[9px] font-sans font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${a.status === "scheduled" ? "text-gold border-gold/20 bg-gold/5" :
                            a.status === "completed" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                              "text-cream/20 border-cream/5 bg-cream/5"
                            }`}>
                            {a.status === "scheduled" ? "Confirmada" : a.status === "completed" ? "Finalizada" : a.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-cream/30 text-xs font-sans uppercase">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString("es-AR") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
              <div>
                <h3 className="text-2xl font-serif font-bold text-cream mb-2 flex items-center gap-3">
                  Catálogo de Tratamientos
                </h3>
                <p className="text-xs text-cream/30 font-sans tracking-wider uppercase">Gestiona los servicios que Nova IA ofrece a los clientes</p>
              </div>
              <button
                onClick={() => { setIsEditing(true); setCurrentService({ active: true }); }}
                className="group flex items-center gap-2 bg-gradient-to-r from-gold to-gold-light text-noir text-xs font-bold px-6 py-3 rounded-full transition-all hover:translate-y-[-2px] hover:shadow-xl hover:shadow-gold/10"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                Nuevo Tratamiento
              </button>
            </div>

            {isEditing ? (
              <div className="bg-noir-light/40 backdrop-blur-xl border border-gold/10 rounded-2xl p-8 mb-12 max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -mr-16 -mt-16" />
                <h4 className="text-lg font-serif font-bold text-cream mb-8 flex items-center gap-3">
                  <div className="w-1 h-5 bg-gold rounded-full" />
                  {currentService.id ? 'Refinar Tratamiento' : 'Alta de Tratamiento Premium'}
                </h4>
                <form onSubmit={handleSaveService} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-cream/30">Nombre del Tratamiento</label>
                    <input autoFocus required type="text" className="w-full bg-noir border border-cream/5 rounded-xl px-4 py-3 text-sm text-cream focus:outline-none focus:border-gold/30 transition-all font-sans"
                      placeholder="Ej. Limpieza Facial Premium" value={currentService.title || ''} onChange={e => setCurrentService({ ...currentService, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-cream/30">Descripción Detallada (IA Context)</label>
                    <textarea required rows={4} className="w-full bg-noir border border-cream/5 rounded-xl px-4 py-3 text-sm text-cream focus:outline-none focus:border-gold/30 transition-all font-sans leading-relaxed"
                      placeholder="Describe el tratamiento para que Nova IA sepa cómo venderlo..." value={currentService.description || ''} onChange={e => setCurrentService({ ...currentService, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-cream/30">Valor Estimado</label>
                      <input type="text" className="w-full bg-noir border border-cream/5 rounded-xl px-4 py-3 text-sm text-gold font-bold focus:outline-none focus:border-gold/30 transition-all font-sans"
                        placeholder="Ej. $15.000" value={currentService.price || ''} onChange={e => setCurrentService({ ...currentService, price: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-cream/30">Sesión (Duración)</label>
                      <input type="text" className="w-full bg-noir border border-cream/5 rounded-xl px-4 py-3 text-sm text-cream/60 focus:outline-none focus:border-gold/30 transition-all font-sans"
                        placeholder="Ej. 60 min" value={currentService.duration || ''} onChange={e => setCurrentService({ ...currentService, duration: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-cream/30">Presentación Visual</label>
                    <div className="flex flex-col gap-4">
                      {currentService.image_url && (
                        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gold/20">
                          <img src={currentService.image_url} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setCurrentService({ ...currentService, image_url: '' })}
                            className="absolute top-2 right-2 bg-noir/80 p-1.5 rounded-full text-rose hover:bg-rose hover:text-white transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-cream/10 rounded-xl hover:border-gold/30 hover:bg-gold/5 transition-all cursor-pointer group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 text-cream/20 group-hover:text-gold transition-colors mb-2" />
                          <p className="text-xs text-cream/40 group-hover:text-cream/60 transition-colors">
                            <span className="font-bold">Haz clic para subir</span> o arrastra
                          </p>
                          <p className="text-[9px] text-cream/20 uppercase tracking-widest mt-1">PNG, JPG o WEBP</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" id="active" className="sr-only peer"
                        checked={currentService.active} onChange={e => setCurrentService({ ...currentService, active: e.target.checked })} />
                      <div className="w-11 h-6 bg-noir peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-noir after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-cream/20 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold peer-checked:after:bg-noir"></div>
                    </div>
                    <label htmlFor="active" className="text-xs uppercase tracking-widest text-cream/50">Disponible para Agendar</label>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-gold to-gold-light text-noir font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-gold/20">
                      {loading ? 'Procesando...' : 'Guardar Tratamiento'}
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-noir-light/60 text-cream/60 border border-cream/5 py-3.5 rounded-xl transition-all hover:bg-noir-light">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map(s => (
                  <div key={s.id} className={`group rounded-2xl border ${s.active ? 'border-cream/5 bg-noir-light/30' : 'border-noir bg-noir opacity-40'} overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:border-gold/20 hover:shadow-2xl`}>
                    <div className="relative h-48 overflow-hidden">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full bg-noir flex items-center justify-center">
                          <span className="text-gold/10 font-serif text-5xl font-bold italic">N</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-noir via-transparent to-transparent opacity-80" />
                      <div className="absolute top-4 right-4">
                        <span className="bg-gold text-noir text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                          ${s.price}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h4 className="text-lg font-serif font-bold text-cream mb-2 group-hover:text-gold transition-colors">{s.title}</h4>
                      <p className="text-xs text-cream/40 mb-6 font-sans leading-relaxed line-clamp-3">{s.description}</p>

                      <div className="flex items-center justify-between pt-5 border-t border-cream/5">
                        <span className="text-[10px] text-cream/20 uppercase tracking-widest font-sans">{s.duration}</span>
                        <div className="flex gap-2">
                          <button onClick={() => { setCurrentService(s); setIsEditing(true); }} className="p-2 rounded-lg bg-cream/5 text-cream/40 hover:text-gold hover:bg-gold/10 transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteService(s.id)} className="p-2 rounded-lg bg-rose/5 text-cream/40 hover:text-rose hover:bg-rose/10 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {services.length === 0 && (
                  <div className="col-span-full py-24 text-center">
                    <div className="w-20 h-20 rounded-full bg-cream/5 flex items-center justify-center mx-auto mb-6">
                      <Plus className="w-10 h-10 text-cream/10" />
                    </div>
                    <p className="text-cream/30 font-serif italic text-lg mb-2">No hay tratamientos registrados aún</p>
                    <p className="text-xs text-cream/10 font-sans uppercase tracking-[0.2em]">Empieza por añadir el primero para tu asistente virtual</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
