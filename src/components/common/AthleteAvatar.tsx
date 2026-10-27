import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface AthleteAvatarProps {
  photoUrl?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  bordered?: boolean;
}

const GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-indigo-600 to-purple-700',
  'from-sky-600 to-blue-700',
  'from-emerald-600 to-teal-700',
  'from-teal-600 to-cyan-700',
  'from-violet-600 to-indigo-800',
  'from-blue-700 to-slate-800',
];

export const AthleteAvatar: React.FC<AthleteAvatarProps> = ({
  photoUrl,
  name,
  size = 'md',
  className = '',
  bordered = false,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if photoUrl changes
  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  // Clean and validate photoUrl: must be string, not empty, and begin with valid prefix
  const cleanedUrl = typeof photoUrl === 'string' ? photoUrl.trim() : '';
  const isLikelyValidUrl =
    Boolean(cleanedUrl) &&
    cleanedUrl !== 'null' &&
    cleanedUrl !== 'undefined' &&
    cleanedUrl !== 'photo_url' &&
    (cleanedUrl.startsWith('data:image/') ||
      cleanedUrl.startsWith('http://') ||
      cleanedUrl.startsWith('https://') ||
      cleanedUrl.startsWith('/') ||
      cleanedUrl.startsWith('blob:')) &&
    !hasError;

  // Compute initials
  const getInitials = (fullName: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  // Pick deterministic gradient by name hash
  const getGradientByName = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % GRADIENTS.length;
    return GRADIENTS[index];
  };

  const gradientClass = getGradientByName(name || 'Atleta');

  // Size styling maps
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  const iconSizes = {
    xs: 12,
    sm: 15,
    md: 18,
    lg: 24,
    xl: 34,
  };

  const borderClass = bordered ? 'border-2 border-white shadow-sm ring-1 ring-slate-200/50' : '';

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center font-black select-none shadow-2xs ${sizeClasses[size]} ${borderClass} ${className}`}
      title={name}
    >
      {/* Background Initials (Always ready as fallback or underlying layer) */}
      <div
        className={`absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-tr ${gradientClass} text-white`}
      >
        {initials ? (
          <span>{initials}</span>
        ) : (
          <User size={iconSizes[size]} className="text-white/80" />
        )}
      </div>

      {/* Real Image Layer if valid URL */}
      {isLikelyValidUrl && (
        <img
          src={cleanedUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-200"
          onError={(e) => {
            setHasError(true);
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
          loading="lazy"
        />
      )}
    </div>
  );
};
