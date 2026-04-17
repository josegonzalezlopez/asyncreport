import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Clock,
  ArrowRight,
  Slack,
  Github,
  Trello,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden flex flex-col font-sans selection:bg-sky-500/30">

      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-center container mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white h-5 w-5" />
          </div>
          AsyncReport
        </div>
        <Link href="/sign-in" className="text-sm text-slate-400 hover:text-white transition-colors">
          Iniciar Sesión
        </Link>
      </nav>

      {/* Split Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 h-full pt-20 lg:pt-0">

        {/* Columna izquierda: Copy & CTA */}
        <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 relative z-10 animate-fade-in">

          <div className="inline-flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-semibold w-fit mb-6">
            <Clock className="h-3 w-3" />
            Deja de perder tiempo
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-balance">
            ¿Otra reunión que pudo ser un{" "}
            <span className="text-sky-400">email</span>?
          </h1>

          <p className="text-lg text-slate-400 mb-8 max-w-md leading-relaxed">
            AsyncReport reemplaza las standups diarias con un sistema asíncrono
            inteligente. Tu equipo reporta en 1 minuto, Gemini genera el resumen.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mb-8">
            <Button
              asChild
              size="lg"
              className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 gap-2 shadow-lg shadow-sky-500/20"
            >
              <Link href="/sign-up">
                Empezar gratis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
            >
              <Link href="/sign-in">Iniciar sesión</Link>
            </Button>
          </div>

          {/* Social proof */}
          <div className="border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">
              Integrado con tu stack
            </p>
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

        {/* Columna derecha: Mockup visual */}
        <div className="relative hidden lg:block bg-slate-900/50 border-l border-white/5 overflow-hidden">
          {/* Glow background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px]" />

          {/* Browser mockup */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 translate-x-12 w-full max-w-2xl shadow-2xl rounded-xl border border-slate-700 overflow-hidden transform -rotate-2 hover:rotate-0 transition-transform duration-700 ease-out bg-slate-950">

            {/* Barra del navegador */}
            <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              <div className="ml-4 h-4 w-64 bg-slate-900/50 rounded text-[10px] flex items-center px-2 text-slate-500 font-mono">
                asyncreport.app/dashboard
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="relative aspect-video w-full bg-slate-900">
              <Image
                src="https://placehold.co/1200x800/1e293b/94a3b8?text=AsyncReport+Dashboard"
                alt="Vista previa del dashboard de AsyncReport"
                fill
                className="object-cover opacity-90"
                priority
                unoptimized
              />
            </div>

            {/* Notificación de IA */}
            <div
              className="absolute bottom-8 right-8 bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 p-4 rounded-lg shadow-2xl max-w-xs animate-bounce"
              style={{ animationDuration: "3s" }}
            >
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-md text-emerald-400 shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-100">
                    Resumen Listo
                  </p>
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
