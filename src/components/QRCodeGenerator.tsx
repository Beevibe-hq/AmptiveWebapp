import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

const QRCodeGenerator = ({ value, size = 200, className = '' }: QRCodeGeneratorProps) => {
  return (
    <QRCodeSVG 
      value={value}
      size={size}
      className={className}
    />
  );
};

export default QRCodeGenerator;
