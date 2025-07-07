const TextLogo = () => {
  return (
    <div className="h-6 w-auto">
      <img 
        src="/amptextlogo.svg" 
        alt="Amptive" 
        className="h-full w-auto"
        style={{
          filter: 'invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%)',
          color: 'currentColor'
        }}
        onError={(e) => {
          console.error('Failed to load text logo:', e);
        }}
      />
    </div>
  );
};

export default TextLogo;
