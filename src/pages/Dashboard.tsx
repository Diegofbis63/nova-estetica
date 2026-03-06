import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Users, CalendarCheck, TrendingUp, ArrowLeft, RefreshCw, Plus, Trash2, Edit, Upload, Image as ImageIcon, GripVertical, ChevronUp, ChevronDown, MessageSquare, Phone as PhoneIcon, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  lead_id?: string;
  client_name?: string;
  phone?: string;
  service_type: string;
  date_time: string;
  status: string;
  created_at: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: string;
  duration: string;
  image_url: string;
  active: boolean;
  sort_order: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState<'leads' | 'services'>('leads');
  const [dateFilter, setDateFilter] = useState<'all' | 'hoy' | 'tomorrow'>('all');

  // Service form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service>>({});

  // Dialog states
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedLeadForChat, setSelectedLeadForChat] = useState<Lead | null>(null);

  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [selectedLeadForAppt, setSelectedLeadForAppt] = useState<Lead | null>(null);

  const [isEditAppointmentModalOpen, setIsEditAppointmentModalOpen] = useState(false);
  const [selectedAppointmentForEdit, setSelectedAppointmentForEdit] = useState<Appointment | null>(null);

  // Form states for simple modal inputs
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formService, setFormService] = useState("");

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
      } catch (e) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    }
  });

  const { data: servData, isLoading: servLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await fetch('/api/services');
      if (!res.ok) throw new Error('Failed to fetch services');
      return res.json();
    }
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await fetch(`/api/appointments?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onMutate: async (newAppt) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previous = queryClient.getQueryData(['dashboard']);
      queryClient.setQueryData(['dashboard'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          appointments: old.appointments.map((a: Appointment) => a.id === newAppt.id ? { ...a, status: newAppt.status } : a)
        };
      });
      return { previous };
    },
    onError: (err, newAppt, context) => {
      queryClient.setQueryData(['dashboard'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const saveService = useMutation({
    mutationFn: async (svc: Partial<Service>) => {
      const method = svc.id ? 'PUT' : 'POST';
      const res = await fetch('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(svc)
      });
      if (!res.ok) throw new Error('Failed to save service');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsEditing(false);
      setCurrentService({});
    }
  });

  const createAppointment = useMutation({
    mutationFn: async ({ lead_id, date_time, service_type }: { lead_id: string, date_time: string, service_type: string }) => {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id, date_time, service_type })
      });
      if (!res.ok) throw new Error('Failed to create appointment');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsNewAppointmentModalOpen(false);
      setFormDate("");
      setFormTime("");
      setFormService("");
    }
  });


  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/services?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });

  const reorderServices = useMutation({
    mutationFn: async (updated: any[]) => {
      const res = await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorder: updated })
      });
      if (!res.ok) throw new Error('Failed to save order');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    navigate("/auth");
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    saveService.mutate(currentService);
  };

  const handleDeleteService = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este servicio?')) return;
    deleteService.mutate(id);
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

  const moveService = (index: number, direction: 'up' | 'down') => {
    if (!servData?.services) return;
    const newServices = [...servData.services];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newServices.length) return;

    const [moved] = newServices.splice(index, 1);
    newServices.splice(targetIndex, 0, moved);

    const updatedServices = newServices.map((s, i) => ({ id: s.id, sort_order: i }));
    queryClient.setQueryData(['services'], { services: newServices.map((s, i) => ({ ...s, sort_order: i })) });

    reorderServices.mutate(updatedServices);
  };

  const leads: Lead[] = dashData?.leads || [];
  const appointments: Appointment[] = dashData?.appointments || [];
  const services: Service[] = servData?.services || [];

  const unbookedLeads = useMemo(() => {
    return leads.filter(l => !appointments.some(a => a.lead_id === l.id && a.status !== 'canceled'));
  }, [leads, appointments]);

  const now = new Date();
  const leadsDeHoy = leads.filter(l => new Date(l.created_at) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)).length;
  const pendientesCount = appointments.filter(a => a.status === "pending" || a.status === "scheduled").length;
  const conversion = leads.length > 0 ? Math.round((appointments.length / leads.length) * 100) : 0;

  const stats = [
    { icon: Users, label: "Leads de Hoy", value: leadsDeHoy, color: "text-gold" },
    { icon: CalendarCheck, label: "Turnos Pendientes", value: pendientesCount, color: "text-amber-400" },
    { icon: TrendingUp, label: "Conversión AI", value: `${conversion}%`, color: "text-emerald-400" },
  ];

  const filteredAppointments = useMemo(() => {
    const target = new Date();
    if (dateFilter === 'tomorrow') {
      target.setDate(target.getDate() + 1);
      return appointments.filter(a => {
        const ad = new Date(a.date_time);
        return ad.getDate() === target.getDate() && ad.getMonth() === target.getMonth() && ad.getFullYear() === target.getFullYear() && a.status !== 'canceled';
      });
    }
    if (dateFilter === 'hoy') {
      return appointments.filter(a => {
        const ad = new Date(a.date_time);
        return ad.getDate() === target.getDate() && ad.getMonth() === target.getMonth() && ad.getFullYear() === target.getFullYear() && a.status !== 'canceled';
      });
    }
    return appointments;
  }, [appointments, dateFilter]);

  const loading = dashLoading || servLoading;

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
                <p className="text-[9px] text-cream/20 font-sans tracking-wide">Centro Operativo • {userName}</p>
              </div>
            </div>
          </div>

          <div className="flex bg-noir-light/60 p-1 rounded-full border border-cream/5 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-5 py-1.5 text-xs font-sans uppercase tracking-widest rounded-full transition-all ${activeTab === 'leads' ? 'bg-gold text-noir font-bold shadow-lg' : 'text-cream/40 hover:text-cream'}`}
            >
              Gestión Operativa
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
              onClick={() => queryClient.invalidateQueries()}
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
                <div key={i} className="group p-6 rounded-2xl border border-cream/5 bg-noir-light/30 backdrop-blur-sm hover:border-gold/20 transition-all duration-300 shadow-xl">
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

            {/* APPOINTMENTS SECTION */}
            <div className="mb-12">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-gold rounded-full" />
                  <h3 className="text-lg font-serif font-bold text-cream tracking-tight">
                    Gestión de Citas Agendadas
                  </h3>
                </div>
                <div className="flex items-center gap-2 bg-noir-light/60 p-1 rounded-full border border-cream/5">
                  <button onClick={() => setDateFilter('all')} className={`px-4 py-1 text-[10px] font-sans uppercase tracking-widest rounded-full transition-all ${dateFilter === 'all' ? 'bg-gold text-noir font-bold' : 'text-cream/40 hover:text-cream'}`}>Todas</button>
                  <button onClick={() => setDateFilter('hoy')} className={`px-4 py-1 text-[10px] font-sans uppercase tracking-widest rounded-full transition-all ${dateFilter === 'hoy' ? 'bg-gold text-noir font-bold' : 'text-cream/40 hover:text-cream'}`}>Hoy</button>
                  <button onClick={() => setDateFilter('tomorrow')} className={`px-4 py-1 text-[10px] font-sans uppercase tracking-widest rounded-full transition-all ${dateFilter === 'tomorrow' ? 'bg-gold text-noir font-bold' : 'text-cream/40 hover:text-cream'}`}>Mañana</button>
                </div>
              </div>

              <div className="rounded-2xl border border-cream/5 bg-noir-light/20 shadow-2xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-cream/5 hover:bg-transparent">
                      <TableHead className="text-[10px] text-cream/30 uppercase tracking-[0.2em] font-sans py-4 px-6">Paciente</TableHead>
                      <TableHead className="text-[10px] text-cream/30 uppercase tracking-[0.2em] font-sans py-4 px-6">Contacto</TableHead>
                      <TableHead className="text-[10px] text-cream/30 uppercase tracking-[0.2em] font-sans py-4 px-6">Servicio</TableHead>
                      <TableHead className="text-[10px] text-cream/30 uppercase tracking-[0.2em] font-sans py-4 px-6">Fecha y Hora</TableHead>
                      <TableHead className="text-[10px] text-cream/30 uppercase tracking-[0.2em] font-sans py-4 px-6">Estado</TableHead>
                      <TableHead className="text-[10px] text-cream/30 uppercase tracking-[0.2em] font-sans py-4 px-6 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="py-20 text-center text-cream/20 font-sans italic">Sincronizando agenda...</TableCell></TableRow>
                    ) : filteredAppointments.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="py-20 text-center text-cream/20 font-sans italic">No hay citas para el filtro seleccionado.</TableCell></TableRow>
                    ) : filteredAppointments.map((a) => {
                      const hasPhone = !!a.phone;
                      return (
                        <TableRow key={a.id} className="border-b border-cream/5 hover:bg-cream/[0.02] transition-colors group">
                          <TableCell className="px-6 py-4">
                            <span className="text-cream font-serif font-bold text-base">{a.client_name || "Paciente"}</span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            {hasPhone ? (
                              <a
                                href={`https://wa.me/${a.phone?.replace(/\\D/g, '')}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium w-fit border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 rounded-md transition-all"
                              >
                                <PhoneIcon className="w-3.5 h-3.5" />
                                {a.phone}
                              </a>
                            ) : <span className="text-cream/40 text-xs">—</span>}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_rgba(238,197,143,0.5)]" />
                              <span className="text-cream/80 text-sm font-sans">{a.service_type || "Tratamiento General"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-cream/80 text-sm font-sans tracking-wide font-medium">
                              {new Date(a.date_time).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" }).replace(/^\w/, c => c.toUpperCase())}
                              <span className="text-cream/30 mx-2">•</span>
                              <span className="text-gold">{new Date(a.date_time).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}hs</span>
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant="outline" className={`text-[9px] font-sans uppercase tracking-widest rounded-full ${a.status === 'confirmed' ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                              a.status === 'canceled' ? "text-rose border-rose/20 bg-rose/5" :
                                a.status === 'pending' || a.status === 'scheduled' ? "text-amber-400 border-amber-500/20 bg-amber-500/5" :
                                  "text-cream/20 border-cream/5 bg-cream/5"
                              }`}>
                              {a.status === 'confirmed' ? "Confirmada" : a.status === 'canceled' ? "Cancelada" : a.status === 'pending' || a.status === 'scheduled' ? "Pendiente" : a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 rounded-lg bg-cream/5 text-cream/60 hover:text-gold hover:bg-gold/10 transition-all focus:outline-none">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-noir-light/95 backdrop-blur-xl border border-gold/10 rounded-xl shadow-2xl">
                                <DropdownMenuLabel className="font-serif text-cream/50 text-xs">Gestión de Cita</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-cream/5" />
                                {a.status !== 'confirmed' && (
                                  <DropdownMenuItem onClick={() => updateAppointment.mutate({ id: a.id, status: 'confirmed' })} className="cursor-pointer text-emerald-400 focus:bg-emerald-400/10 focus:text-emerald-300 transition-colors font-sans text-xs flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Cita
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedAppointmentForEdit(a);
                                    const d = new Date(a.date_time);
                                    setFormDate(d.toISOString().split('T')[0]);
                                    setFormTime(d.toTimeString().split(' ')[0].slice(0, 5));
                                    setFormService(a.service_type || "");
                                    setIsEditAppointmentModalOpen(true);
                                  }}
                                  className="cursor-pointer text-cream/70 focus:bg-gold/10 focus:text-gold transition-colors font-sans text-xs flex items-center gap-2"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Editar (Reprogramar)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-cream/5" />
                                {a.status !== 'canceled' && (
                                  <DropdownMenuItem onClick={() => updateAppointment.mutate({ id: a.id, status: 'canceled' })} className="cursor-pointer text-rose focus:bg-rose/10 focus:text-rose transition-colors font-sans text-xs flex items-center gap-2">
                                    <XCircle className="w-3.5 h-3.5" /> Cancelar Cita
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* LEADS SECTION */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-cream/20 rounded-full" />
                  <h3 className="text-lg font-serif font-bold text-cream tracking-tight">
                    Pipeline de Clientes Potenciales
                  </h3>
                </div>
              </div>
              <div className="rounded-2xl border border-cream/5 bg-noir-light/20 shadow-2xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-cream/5 hover:bg-transparent">
                      <TableHead className="text-[10px] text-cream/30 uppercase tracking-[0.2em] font-sans py-4 px-6">Prospecto</TableHead>
                      <TableHead className="text-[10px] text-cream/30 uppercase tracking-[0.2em] font-sans py-4 px-6">Interés</TableHead>
                      <TableHead className="text-[10px] text-cream/30 uppercase tracking-[0.2em] font-sans py-4 px-6">Última Interacción</TableHead>
                      <TableHead className="text-[10px] text-cream/30 uppercase tracking-[0.2em] font-sans py-4 px-6 text-right">Gestión</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="py-20 text-center text-cream/20 font-sans italic">Analizando interacciones...</TableCell></TableRow>
                    ) : unbookedLeads.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="py-20 text-center text-cream/20 font-sans italic">No hay prospectos esperando turno.</TableCell></TableRow>
                    ) : unbookedLeads.map((l, idx) => {
                      return (
                        <TableRow key={l.id || idx} className="border-b border-cream/5 hover:bg-cream/[0.02] transition-colors group">
                          <TableCell className="px-6 py-4">
                            <span className="text-cream font-serif font-bold text-base">{l.client_name}</span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 font-bold">{l.intent_score || 85}%</span>
                              <Badge variant="outline" className={`text-[9px] font-sans uppercase tracking-widest rounded-full ${l.status === "qualified" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                                l.status === "contacted" ? "text-amber-400 border-amber-500/20 bg-amber-500/5" :
                                  "text-cream/40 border-cream/10 bg-cream/5"
                                }`}>
                                {l.status === "qualified" ? "Alta" : l.status === "contacted" ? "Media" : "Evaluando"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-cream/80 text-sm font-sans font-medium">
                            {l.created_at ? (
                              <>
                                {new Date(l.created_at).toLocaleDateString("es-AR", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                <span className="text-cream/30 mx-2">•</span>
                                <span className="text-gold">{new Date(l.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}hs</span>
                              </>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedLeadForChat(l);
                                  setIsChatModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-cream/5 border border-cream/10 hover:bg-gold/10 hover:text-gold hover:border-gold/20 text-cream/40 rounded-lg transition-all text-xs font-medium"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Log
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedLeadForAppt(l);
                                  setIsNewAppointmentModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 text-emerald-400 rounded-lg transition-all text-xs font-medium"
                              >
                                <CalendarCheck className="w-3.5 h-3.5" /> Agendar
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
                <p className="text-xs text-cream/30 font-sans tracking-wider uppercase">Gestiona los servicios y el orden en que aparecen en el inicio</p>
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
                    <button type="submit" disabled={saveService.isPending} className="flex-1 bg-gradient-to-r from-gold to-gold-light text-noir font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-gold/20">
                      {saveService.isPending ? 'Procesando...' : 'Guardar Tratamiento'}
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-noir-light/60 text-cream/60 border border-cream/5 py-3.5 rounded-xl transition-all hover:bg-noir-light">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map((s, index) => (
                  <div key={s.id} className={`group rounded-2xl border ${s.active ? 'border-cream/5 bg-noir-light/30' : 'border-noir bg-noir opacity-40'} overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:border-gold/20 hover:shadow-2xl relative shadow-xl`}>
                    <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveService(index, 'up'); }}
                        disabled={index === 0}
                        className="p-1.5 rounded-md bg-noir/80 text-gold/60 hover:text-gold hover:bg-noir disabled:opacity-30 disabled:hover:bg-noir/80 transition-all border border-cream/5"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveService(index, 'down'); }}
                        disabled={index === services.length - 1}
                        className="p-1.5 rounded-md bg-noir/80 text-gold/60 hover:text-gold hover:bg-noir disabled:opacity-30 disabled:hover:bg-noir/80 transition-all border border-cream/5"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

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

      {/* DIALOGS */}

      {/* 1. View Chat Dialog */}
      <Dialog open={isChatModalOpen} onOpenChange={setIsChatModalOpen}>
        <DialogContent className="bg-noir border border-gold/20 text-cream/90 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gold" />
              Historial de IA
            </DialogTitle>
            <DialogDescription className="text-cream/50">
              Conversación con {selectedLeadForChat?.client_name}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-noir-light/50 p-4 rounded-xl border border-cream/5 h-64 flex flex-col items-center justify-center text-center mt-4">
            <MessageSquare className="w-10 h-10 text-cream/10 mb-2" />
            <p className="text-sm text-cream/40 italic">Las transcripciones completas no están habilitadas en esta demostración base.</p>
            <p className="text-xs text-cream/20 mt-1">Status Actual: {selectedLeadForChat?.status}</p>
          </div>
          <DialogFooter>
            <button onClick={() => setIsChatModalOpen(false)} className="px-4 py-2 border border-cream/10 rounded-lg text-cream/60 hover:bg-cream/5">Cerrar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Convert to Appointment Dialog */}
      <Dialog open={isNewAppointmentModalOpen} onOpenChange={setIsNewAppointmentModalOpen}>
        <DialogContent className="bg-noir border border-gold/20 text-cream/90">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Convertir a Cita
            </DialogTitle>
            <DialogDescription className="text-cream/50">
              Agendar cita manual para {selectedLeadForAppt?.client_name}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedLeadForAppt && formDate && formTime && formService) {
                createAppointment.mutate({
                  lead_id: selectedLeadForAppt.id,
                  date_time: `${formDate}T${formTime}:00Z`,
                  service_type: formService
                });
              }
            }}
            className="flex flex-col gap-4 mt-4"
          >
            <div>
              <label className="text-xs text-cream/40 uppercase tracking-widest mb-1 block">Servicio de Interés</label>
              <select
                value={formService}
                onChange={(e) => setFormService(e.target.value)}
                required
                className="w-full bg-noir-light border border-cream/10 rounded-lg px-3 py-2 outline-none focus:border-gold/50"
              >
                <option value="" disabled>Seleccionar...</option>
                {services.map(s => <option key={s.id} value={s.title}>{s.title}</option>)}
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-cream/40 uppercase tracking-widest mb-1 block">Fecha</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  required
                  className="w-full bg-noir-light border border-cream/10 rounded-lg px-3 py-2 outline-none focus:border-gold/50 [color-scheme:dark]"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-cream/40 uppercase tracking-widest mb-1 block">Hora</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  required
                  className="w-full bg-noir-light border border-cream/10 rounded-lg px-3 py-2 outline-none focus:border-gold/50 [color-scheme:dark]"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <button type="button" onClick={() => setIsNewAppointmentModalOpen(false)} className="px-4 py-2 border border-cream/10 rounded-lg text-cream/60 hover:bg-cream/5">Cancelar</button>
              <button disabled={createAppointment.isPending} type="submit" className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 font-medium">
                {createAppointment.isPending ? 'Creando...' : 'Agendar Cita'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Edit Appointment Dialog */}
      <Dialog open={isEditAppointmentModalOpen} onOpenChange={setIsEditAppointmentModalOpen}>
        <DialogContent className="bg-noir border border-gold/20 text-cream/90">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Edit className="w-5 h-5 text-gold" />
              Reprogramar Cita
            </DialogTitle>
            <DialogDescription className="text-cream/50">
              Cambia la fecha o el horario de esta cita.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedAppointmentForEdit && formDate && formTime) {
                // We use the existing updateAppointment hook, but we need to supply date_time and service.
                // Our updateAppointment currently only sends 'status' in mutationFn. Let's fix that just above or use a direct fetch.
                fetch(`/api/appointments?id=${selectedAppointmentForEdit.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    date_time: `${formDate}T${formTime}:00Z`,
                    service_type: formService
                  })
                }).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                  setIsEditAppointmentModalOpen(false);
                });
              }
            }}
            className="flex flex-col gap-4 mt-4"
          >
            <div>
              <label className="text-xs text-cream/40 uppercase tracking-widest mb-1 block">Servicio Reservado</label>
              <select
                value={formService}
                onChange={(e) => setFormService(e.target.value)}
                required
                className="w-full bg-noir-light border border-cream/10 rounded-lg px-3 py-2 outline-none focus:border-gold/50"
              >
                <option value="" disabled>Seleccionar...</option>
                {/* Fallback to original value if the service no longer exists in DB list */}
                {!services.some(s => s.title === formService) && formService !== "" && (
                  <option value={formService}>{formService}</option>
                )}
                {services.map(s => <option key={s.id} value={s.title}>{s.title}</option>)}
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-cream/40 uppercase tracking-widest mb-1 block">Fecha</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  required
                  className="w-full bg-noir-light border border-cream/10 rounded-lg px-3 py-2 outline-none focus:border-gold/50 [color-scheme:dark]"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-cream/40 uppercase tracking-widest mb-1 block">Hora</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  required
                  className="w-full bg-noir-light border border-cream/10 rounded-lg px-3 py-2 outline-none focus:border-gold/50 [color-scheme:dark]"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <button type="button" onClick={() => setIsEditAppointmentModalOpen(false)} className="px-4 py-2 border border-cream/10 rounded-lg text-cream/60 hover:bg-cream/5">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-gold text-noir rounded-lg hover:shadow-[0_0_15px_rgba(238,197,143,0.5)] font-bold transition-shadow">
                Guardar Cambios
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
