import { Network } from "lucide-react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-gradient-to-b from-slate-100 via-sky-50/40 to-slate-100 dark:from-[#050811] dark:via-[#090e1d] dark:to-[#050811] px-3 py-6 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="relative isolate mx-auto flex w-full max-w-5xl flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/85 backdrop-blur-2xl shadow-[0_30px_80px_-28px_rgba(15,23,42,0.35)] lg:min-h-[580px] lg:flex-row overflow-hidden my-auto">
        {/* Glow ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 right-[-5rem] h-64 w-64 rounded-full bg-sky-500/20 blur-3xl sm:right-[-2rem]" />
          <div className="absolute -bottom-20 left-[-5rem] h-72 w-72 rounded-full bg-blue-600/15 blur-3xl sm:left-[-2rem]" />
        </div>

        {/* Sidebar Brand info for desktop */}
        <aside className="relative hidden lg:flex lg:w-5/12 flex-col items-center justify-center border-r border-slate-200/80 dark:border-slate-800 p-8 xl:p-10 text-center bg-slate-50/50 dark:bg-slate-950/30">
          <div className="relative flex flex-col items-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-xl shadow-sky-600/25 text-white">
              <Network className="w-8 h-8" strokeWidth={2.5} />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center rounded-full border border-sky-200 dark:border-sky-800/80 bg-sky-50/80 dark:bg-sky-950/50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                Enterprise Infrastructure
              </span>
              <h1 className="text-2xl xl:text-3xl font-extrabold leading-tight text-slate-900 dark:text-white tracking-tight">
                GESN Device Management
              </h1>
              <p className="max-w-xs text-xs xl:text-sm text-slate-500 dark:text-slate-400">
                Centralized network inventory, real-time monitoring, and hardware lifecycle control.
              </p>
            </div>
          </div>
        </aside>

        {/* Form Container */}
        <main className="relative flex w-full lg:w-7/12 flex-col justify-center items-center p-4 sm:p-8 md:p-10 overflow-y-auto">
          {/* Mobile Header */}
          <div className="flex flex-col lg:hidden mb-4 sm:mb-6 text-center w-full max-w-sm">
            <div className="mb-2 flex justify-center items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md shadow-sky-600/20">
                <Network className="w-4.5 h-4.5" strokeWidth={2.5} />
              </div>
              <span className="font-extrabold text-base text-slate-900 dark:text-white">
                GESN
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Device Management
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enterprise network & device administration
            </p>
          </div>

          <div className="w-full max-w-[440px] sm:max-w-[460px] mx-auto flex justify-center items-center">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
