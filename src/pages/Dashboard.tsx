import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Users, CalendarCheck, TrendingUp, Sparkles, ArrowLeft, RefreshCw } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;
type Appointment = Tables<"appointments">;

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/auth");
    });

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUserName(session.user.user_metadata?.full_name || session.user.email || "");
      await fetchData();
    };

    checkAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    const [leadsRes, apptRes] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("appointments").select("*").order("date_time", { ascending: false }).limit(50),
    ]);
    setLeads(leadsRes.data || []);
    setAppointments(apptRes.data || []);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-zinc-500 hover:text-cyan-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-[0.12em] uppercase bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                NOVA Estética — Dashboard
              </span>
              <p className="text-[10px] text-zinc-600 font-mono">Bienvenido/a, {userName}</p>
            </div>
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

        {/* Stats */}
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

        {/* Leads Table */}
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
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-600 text-xs">Sin leads aún. Cuando alguien converse con Aura y agende una cita, aparecerá aquí.</td></tr>
                  ) : leads.map((l) => {
                    const email = (l.contact_info as Record<string, unknown>)?.email as string || "—";
                    return (
                      <tr key={l.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{l.client_name}</td>
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

        {/* Appointments Table */}
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
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600 text-xs">Sin citas aún. Aura las agenda automáticamente desde el chat.</td></tr>
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
      </div>
    </div>
  );
}
