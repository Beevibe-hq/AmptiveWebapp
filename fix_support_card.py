import re

with open('src/components/SupportCard.tsx', 'r') as f:
    content = f.read()

# Add import
if 'getEmojiFallback' not in content:
    content = "import { getEmojiFallback } from '@/utils/avatar';\n" + content

# Add SupportAvatar component right before SupportCard
if 'const SupportAvatar' not in content:
    avatar_comp = """
const SupportAvatar = ({ url, name, username, className }: { url?: string; name: string; username: string; className: string }) => {
  if (url && url !== "https://gjkvrllwtjktcarnikus.supabase.co/storage/v1/object/public/avatars/avatars/5f395bf7-ca2d-44a4-8203-519e9a933d3d-0.7536191962551382.jpg") {
    return <img src={url} alt={name} className={className} />;
  }
  return (
    <div className={`bg-gray-100 flex items-center justify-center text-center ${className}`} style={{ fontSize: className.includes('w-14') ? '1.75rem' : '3rem' }}>
      {getEmojiFallback(username)}
    </div>
  );
};
"""
    content = content.replace('const SupportCard: React.FC<SupportCardProps>', avatar_comp + '\nconst SupportCard: React.FC<SupportCardProps>')

# Replace the img tags
content = content.replace('<img src={avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover" />', '<SupportAvatar url={avatarUrl} name={name} username={username} className="w-14 h-14 rounded-full object-cover" />')
content = content.replace('<img src={avatarUrl} alt={name} className="w-full h-full object-cover" />', '<SupportAvatar url={avatarUrl} name={name} username={username} className="w-full h-full object-cover" />')

with open('src/components/SupportCard.tsx', 'w') as f:
    f.write(content)

