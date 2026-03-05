import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Users, CalendarCheck, TrendingUp, Sparkles, ArrowLeft, RefreshCw, Plus, Trash2, Edit } from "lucide-react";

export default function Dashboard() {
  const [leads, setLeads] = useState<Record<string, unknown>[]>([]);
  const [appointments, setAppointments] = useState<Record<string, unknown>[]>([]);
  const [services, setServices] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState<'leads' | 'services'>('leads');

  // Service form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<Record<string, unknown>>({});

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

  const avgIntent = leads.length > 0
    ? Math.round(leads.reduce((sum, l) => sum + (l.intent_score || 0), 0) / leads.length)
    : 0;
  const scheduledCount = appointments.filter(a => a.status === "scheduled").length;

  const stats = [
    { icon: Users, label: "Total Leads", value: leads.length, gradient: "from-cyan-400 to-cyan-600" },
    { icon: CalendarCheck, label: "Citas Agendadas", value: scheduledCount, gradient: "from-blue-400 to-blue-600" },
    { icon: TrendingUp, label: "Intent Score Prom.", value: `${avgIntent}%`, gradient: "from-purple-400 to-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-b border-zinc-800/80 gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-zinc-500 hover:text-cyan-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-[0.12em] uppercase bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                NOVA Estética
              </span>
              <p className="text-[10px] text-zinc-600 font-mono">Bienvenido/a, {userName}</p>
            </div>
          </div>
          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/80">
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'leads' ? 'bg-cyan-600/20 text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
            >
              Panel de Leads
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'services' ? 'bg-cyan-600/20 text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
            >
              Servicios
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors border border-zinc-800 rounded-lg px-3 py-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors border border-zinc-800 rounded-lg px-3 py-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>
        </header>

        {activeTab === 'leads' ? (
          <>
            <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {stats.map((s, i) => (
                <div key={i} className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.gradient} bg-opacity-10 flex items-center justify-center`}>
                      <s.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">{s.label}</span>
                  </div>
                  <p className="text-3xl font-black bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    {loading ? "—" : s.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-6 pb-4 max-w-6xl mx-auto">
              <h3 className="text-sm font-bold text-white mb-3 tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> Leads — Clientes Potenciales
              </h3>
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800/80 text-zinc-500 text-[11px] font-mono uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Cliente</th>
                        <th className="text-left px-4 py-3">Email</th>
                        <th className="text-left px-4 py-3">Estado</th>
                        <th className="text-left px-4 py-3">Intent Score</th>
                        <th className="text-left px-4 py-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-600 text-xs">Cargando datos...</td></tr>
                      ) : leads.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-600 text-xs">Sin leads aún. Cuando alguien converse con Nova y agende una cita, aparecerá aquí.</td></tr>
                      ) : leads.map((l, idx) => {
                        const email = (l.contact_info as Record<string, unknown>)?.email as string || "—";
                        return (
                          <tr key={l.id as string || idx} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
                            <td className="px-4 py-3 text-white font-medium">{l.client_name as string}</td>
                            <td className="px-4 py-3 text-zinc-400 text-xs font-mono">{email}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${l.status === "qualified" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                                l.status === "contacted" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                                  "text-zinc-400 border-zinc-600/30 bg-zinc-600/10"
                                }`}>
                                {l.status === "qualified" ? "Calificado" : l.status === "contacted" ? "Contactado" : "Nuevo"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${(l.intent_score || 0) >= 70 ? "bg-gradient-to-r from-emerald-500 to-cyan-500" :
                                      (l.intent_score || 0) >= 40 ? "bg-gradient-to-r from-amber-500 to-yellow-500" :
                                        "bg-gradient-to-r from-zinc-600 to-zinc-500"
                                      }`}
                                    style={{ width: `${l.intent_score || 0}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono">{l.intent_score || 0}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-zinc-500 text-xs font-mono">
                              {l.created_at ? new Date(l.created_at).toLocaleDateString("es-AR") : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 pb-12 max-w-6xl mx-auto">
              <h3 className="text-sm font-bold text-white mb-3 tracking-wide flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-blue-400" /> Citas Agendadas
              </h3>
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800/80 text-zinc-500 text-[11px] font-mono uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Tratamiento</th>
                        <th className="text-left px-4 py-3">Fecha y Hora</th>
                        <th className="text-left px-4 py-3">Estado</th>
                        <th className="text-left px-4 py-3">Creada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600 text-xs">Cargando datos...</td></tr>
                      ) : appointments.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600 text-xs">Sin citas aún. Nova las agenda automáticamente desde el chat.</td></tr>
                      ) : appointments.map((a) => (
                        <tr key={a.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
                          <td className="px-4 py-3 text-white font-medium">{a.service_type || "General"}</td>
                          <td className="px-4 py-3 text-zinc-300 text-xs font-mono">
                            {new Date(a.date_time).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                            {" "}
                            {new Date(a.date_time).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${a.status === "scheduled" ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" :
                              a.status === "completed" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                                a.status === "cancelled" ? "text-red-400 border-red-500/30 bg-red-500/10" :
                                  "text-zinc-400 border-zinc-600/30 bg-zinc-600/10"
                              }`}>
                              {a.status === "scheduled" ? "Agendada" : a.status === "completed" ? "Completada" : a.status === "cancelled" ? "Cancelada" : a.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs font-mono">
                            {a.created_at ? new Date(a.created_at).toLocaleDateString("es-AR") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" /> Catálogo de Servicios
              </h3>
              <button
                onClick={() => { setIsEditing(true); setCurrentService({ active: true }); }}
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" /> Nuevo Servicio
              </button>
            </div>

            {isEditing ? (
              <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-xl p-6 mb-8 max-w-2xl">
                <h4 className="text-md font-bold text-white mb-4">{currentService.id ? 'Editar Servicio' : 'Crear Nuevo Servicio'}</h4>
                <form onSubmit={handleSaveService} className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Título del Servicio</label>
                    <input autoFocus required type="text" className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-4 py-2 text-sm text-white"
                      value={currentService.title || ''} onChange={e => setCurrentService({ ...currentService, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Descripción (Para Nova AI e interfaz)</label>
                    <textarea required rows={3} className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-4 py-2 text-sm text-white"
                      value={currentService.description || ''} onChange={e => setCurrentService({ ...currentService, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Precio (USD/ARS)</label>
                      <input type="number" step="0.01" className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-4 py-2 text-sm text-white"
                        value={currentService.price || ''} onChange={e => setCurrentService({ ...currentService, price: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Duración (ej. 60 min)</label>
                      <input type="text" className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-4 py-2 text-sm text-white"
                        value={currentService.duration || ''} onChange={e => setCurrentService({ ...currentService, duration: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">URL de Imagen/Video Ilustrativo</label>
                    <input type="url" placeholder="https://..." className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-4 py-2 text-sm text-white"
                      value={currentService.image_url || ''} onChange={e => setCurrentService({ ...currentService, image_url: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="active" className="rounded bg-zinc-800"
                      checked={currentService.active} onChange={e => setCurrentService({ ...currentService, active: e.target.checked })} />
                    <label htmlFor="active" className="text-sm text-zinc-300">Servicio Activo</label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="submit" disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                      {loading ? 'Guardando...' : 'Guardar Servicio'}
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg text-sm transition-colors">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(s => (
                  <div key={s.id} className={`rounded-xl border ${s.active ? 'border-zinc-700/80 bg-zinc-800/30' : 'border-zinc-800 bg-zinc-900/10 opacity-60'} overflow-hidden`}>
                    {s.image_url && <img src={s.image_url} alt={s.title} className="w-full h-40 object-cover" />}
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-md font-bold text-white">{s.title}</h4>
                        <span className="text-cyan-400 text-sm font-mono font-bold">${s.price}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mb-4 line-clamp-3">{s.description}</p>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800">
                        <span className="text-xs text-zinc-500">{s.duration}</span>
                        <div className="flex gap-2">
                          <button onClick={() => { setCurrentService(s); setIsEditing(true); }} className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteService(s.id)} className="p-1.5 rounded-md hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {services.length === 0 && (
                  <div className="col-span-full py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                    No has agregado ningún servicio aún. Nova no tendrá tratamientos para ofrecer.
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
