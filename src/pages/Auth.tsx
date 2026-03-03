import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Mail, Lock, User, ArrowRight } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate("/dashboard");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) setError(error.message);
      else setMessage("Revisa tu email para confirmar tu cuenta.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center relative overflow-hidden px-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-[0.15em] uppercase bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Aura AI
          </span>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-8 shadow-[0_0_60px_rgba(6,182,212,0.1)]">
          <h2 className="text-lg font-bold text-white text-center mb-1 tracking-wide">
            {isLogin ? "Acceder al Dashboard" : "Crear Cuenta"}
          </h2>
          <p className="text-xs text-zinc-500 text-center mb-6">
            {isLogin ? "Ingresa tus credenciales" : "Regístrate como vendedor"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-10 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_10px_rgba(6,182,212,0.1)] transition-all"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-10 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_10px_rgba(6,182,212,0.1)] transition-all"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-10 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_10px_rgba(6,182,212,0.1)] transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
            {message && (
              <p className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
            >
              {loading ? "Procesando..." : isLogin ? "Iniciar Sesión" : "Registrarse"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-xs text-zinc-500 text-center mt-6">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {isLogin ? "Regístrate" : "Inicia Sesión"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
