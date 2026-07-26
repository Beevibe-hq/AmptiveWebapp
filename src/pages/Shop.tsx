

const Shop = () => {
  return (
    <div className="min-h-screen bg-[#FBFBFB] pt-20 pb-16 md:pt-28 md:pb-20">
      <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-3xl flex-col items-center justify-center px-6 text-center">
        {/* Launching soon badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-700 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Store Launching Soon
        </div>

        {/* Stacked video card */}
        <div className="group relative mx-auto mb-8 h-44 w-60 sm:h-52 sm:w-72 md:h-56 md:w-80 cursor-pointer">
          {/* Bottom card */}
          <div className="absolute inset-0 -rotate-6 -translate-x-2 translate-y-1.5 scale-95 rounded-2xl border border-gray-300/80 bg-gray-200/90 shadow-xs transition-all duration-500 ease-out group-hover:-rotate-12 group-hover:-translate-x-5 group-hover:translate-y-3 group-hover:bg-gray-200" />
          {/* Middle card */}
          <div className="absolute inset-0 rotate-3 translate-x-1.5 -translate-y-1 scale-[0.98] rounded-2xl border border-gray-200 bg-white shadow-xs transition-all duration-500 ease-out group-hover:rotate-8 group-hover:translate-x-4 group-hover:-translate-y-2 group-hover:shadow-md" />
          
          {/* Top video card */}
          <div className="relative h-full w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md transition-all duration-500 ease-out group-hover:scale-[1.02] group-hover:-translate-y-1 group-hover:shadow-xl">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover"
              src="/videos/amptivead.mp4"
            />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl md:text-6xl">
          Gear Built for Greatness.
        </h1>

        {/* Mobile subtext */}
        <p className="mt-3 max-w-xs text-sm font-normal leading-6 text-gray-600 md:hidden">
          Get top-tier audio gear and merchandise directly from us.
        </p>

        {/* Desktop subtext */}
        <p className="mt-5 hidden max-w-xl text-base font-normal leading-7 text-gray-600 md:block md:text-lg">
          We are building a dedicated store for creators to get top-tier audio gear, equipment, and merchandise directly from us.
        </p>
      </div>
    </div>
  );
};

export default Shop;