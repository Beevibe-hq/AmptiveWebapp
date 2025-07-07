interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

const QRCodeGenerator = ({ value, size = 200, className = '' }: QRCodeGeneratorProps) => {
  // Using QR Code Generator API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  
  return (
    <img 
      src={qrCodeUrl}
      alt="QR Code"
      className={className}
      width={size}
      height={size}
    />
  );
};

export default QRCodeGenerator;
