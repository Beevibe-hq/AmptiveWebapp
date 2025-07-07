const Logo = () => {
  return (
    <div className="relative h-10 w-10 flex items-center justify-center hidden md:block">
      <img 
        src="/amptivelogo.svg" 
        alt="Amptive Logo" 
        className="h-full w-auto text-current" 
        style={{
          filter: 'invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%)',
          color: 'currentColor'
        }}
        onError={(e) => {
          console.error('Failed to load logo:', e);
        }}
      />
    </div>
  );
};

export default Logo;
