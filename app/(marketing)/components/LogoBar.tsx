export function LogoBar() {
  return (
    <section className="border-y border-slate-100 bg-white py-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-8">
          Trusted by agencies across Latin America
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {agencies.map((name) => (
            <span
              key={name}
              className="text-base font-display font-bold text-slate-300 tracking-tight select-none"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const agencies = [
  "Aventura Maya",
  "Cusco Expeditions",
  "Patagonia Trek",
  "Caribe Tours",
  "Andes Explorer",
  "Riviera Guides",
  "Galápagos Way",
  "Sacred Valley Co.",
];
