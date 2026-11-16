import { useState } from 'react';
import { Laptop } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className = 'w-full h-full object-cover' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0] text-[#475569] p-4 text-center">
        <Laptop className="w-8 h-8 mb-2 text-[#64748B]" strokeWidth={1.5} />
        <span className="text-xs font-medium line-clamp-2 max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
