"use client";
import Image from 'next/image';

export default function HomePage() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Logo plein écran, centré */}
      <div style={{ position: 'relative', width: '90vw', height: '90vh' }}>
        <Image
          src="/logo.png"
          alt="Logo DoWee"
          fill
          priority
          style={{ objectFit: 'contain' }}
          sizes="(max-width: 768px) 90vw, 90vw"
        />
      </div>
    </div>
  );
}
