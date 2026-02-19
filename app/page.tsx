"use client";

/*import Image from "next/image";*/
import Link from "next/link";
import { 
  Activity, 
  Clock, 
  ArrowRight, 
  Slack, 
  Github, 
  Trello, 
  Sparkles 
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden flex flex-col font-sans selection:bg-sky-500/30">

      {/* Navbar Minimalista */}
      <nav className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-center container mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white h-5 w-5" />
          </div>
          AsyncReport
        </div>
        <Link href="#" className="text-sm text-slate-400 hover:text-white transition-colors">
          Iniciar Sesión
        </Link>
      </nav>

      {/* Split Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 h-full pt-20 lg:pt-0">
        
        {/* COLUMNA IZQUIERDA: Copy & Form */}
        <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 relative z-10">
          
          {/* Badge de problema */}
          <div className="inline-flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-semibold w-fit mb-6">
            <Clock className="h-3 w-3" />
            Deja de perder tiempo
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-balance">
            ¿Otra reunión que pudo ser un <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400 inline-block">email</span>?
          </h1>
          
          <p className="text-lg text-slate-400 mb-8 max-w-md leading-relaxed">
            AsyncReport reemplaza las standups diarias con un sistema asíncrono inteligente. Tu equipo reporta en 1 minuto, Gemini genera el resumen.
          </p>

          {/* Formulario de Registro Rápido */}
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mb-8">
            <input 
              type="email" 
              placeholder="tu@empresa.com" 
              className="bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-sky-500 w-full placeholder:text-slate-500"
            />
            <button type="button" className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-6 py-3 rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20">
              Empezar <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Social Proof / Trust */}
          <div className="border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Integrado con tu stack</p>
            <div className="flex gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2 font-semibold text-slate-300">
                <Slack className="h-4 w-4" /> Slack
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-300">
                <Github className="h-4 w-4" /> GitHub
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-300">
                <Trello className="h-4 w-4" /> Jira
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Visual */}
        <div className="relative hidden lg:block bg-slate-900/50 border-l border-white/5 overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px]" />
          
          {/* Mockup Container (Rotated/Styled) */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 translate-x-12 w-full max-w-2xl shadow-2xl rounded-xl border border-slate-700 overflow-hidden transform -rotate-2 hover:rotate-0 transition-transform duration-700 ease-out bg-slate-950">
            {/* Header del navegador falso */}
            <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              <div className="ml-4 h-4 w-64 bg-slate-900/50 rounded text-[10px] flex items-center px-2 text-slate-500 font-mono">
                asyncreport.app/dashboard
              </div>
            </div>
            
            {/* IMPORTANTE: Si no tienes la imagen aún, usa este div de placeholder.
               Cuando tengas la imagen 'dashboard-mockup.png' en la carpeta 'public',
               descomenta el componente <Image /> de abajo.
            */}
            
            {/* OPCIÓN 1: Placeholder seguro (ÚSALO AHORA) */}
            <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center border-b border-slate-800">
                 <p className="text-slate-600 font-mono text-sm">Preview del Dashboard</p>
            </div>

            {/* OPCIÓN 2: Imagen Real (DESCOMENTAR CUANDO TENGAS LA FOTO EN /public) 
            <div className="relative aspect-video w-full bg-slate-900">
                <Image 
                    src="/dashboard-mockup.png"
                    alt="Dashboard Preview" 
                    fill
                    className="object-cover opacity-90"
                    priority
                />
            </div>
            */}

            {/* AI Overlay Notification */}
            <div className="absolute bottom-8 right-8 bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 p-4 rounded-lg shadow-2xl max-w-xs animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-md text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-100">Resumen Listo</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Gemini ha detectado 2 bloqueos en el proyecto Backend.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}