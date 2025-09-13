import { toast } from 'sonner';

const baseStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#1f2937',
  padding: '10px 16px',
  borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
  fontSize: '14px',
  marginTop: '20px',
  border: '1px solid #e5e7eb',
  // Keep toast on one line and avoid wrapping
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  // Allow long messages to fit viewport width without wrapping
  maxWidth: '90vw',
  width: 'fit-content',
  minWidth: 'auto',
  marginLeft: 'auto',
  marginRight: 'auto',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px'
};

const duration = 3000;

export const toastSuccess = (message: string) =>
  toast.success(message, ({
    duration,
    style: baseStyle,
    iconTheme: { primary: '#10B981', secondary: 'white' }
  } as any));

export const toastInfo = (message: string) =>
  toast.message(message, ({
    duration,
    style: baseStyle,
    iconTheme: { primary: '#3B82F6', secondary: 'white' }
  } as any));

export const toastError = (message: string) =>
  toast.error(message, ({
    duration,
    style: baseStyle,
    iconTheme: { primary: '#EF4444', secondary: 'white' }
  } as any));
