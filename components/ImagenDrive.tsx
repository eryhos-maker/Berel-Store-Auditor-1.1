import React, { useEffect, useState } from 'react';
import { SheetsService } from '../services/sheetsService';

interface ImagenDriveProps {
  src: string;
  alt: string;
  className?: string;
}

// Muestra una imagen que puede venir del celular (data:...) o de Drive (link guardado en la hoja).
const ImagenDrive: React.FC<ImagenDriveProps> = ({ src, alt, className }) => {
  const [url, setUrl] = useState(src.startsWith('data:') ? src : '');
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    setError(false);
    SheetsService.getImage(src)
      .then(u => { if (vigente) setUrl(u); })
      .catch(() => { if (vigente) setError(true); });
    return () => { vigente = false; };
  }, [src]);

  if (error) {
    return (
      <a href={src} target="_blank" rel="noreferrer" className="text-[9px] text-fdn-blue underline">
        Ver {alt.toLowerCase()} en Drive
      </a>
    );
  }
  if (!url) return <span className="text-[9px] text-fdn-muted animate-pulse">Cargando…</span>;
  return <img src={url} alt={alt} className={className} />;
};

export default ImagenDrive;
