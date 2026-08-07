'use client';

import { useState } from 'react';
import Image from 'next/image';
import { deletePropertyMedia, reorderPropertyMedia, uploadPropertyMedia } from '@/lib/api';
import type { PropertyMedia } from '@/lib/types';

export function PropertyMediaManager({
  propertyId,
  media,
  onChange,
}: {
  propertyId: string;
  media: PropertyMedia[];
  onChange: (media: PropertyMedia[]) => void;
}) {
  const [uploading, setUploading] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    setError('');
    const list = Array.from(files);
    const uploaded: PropertyMedia[] = [];
    for (const [index, file] of list.entries()) {
      setUploading({ current: index + 1, total: list.length });
      try {
        uploaded.push(await uploadPropertyMedia(propertyId, file));
      } catch (err) {
        setError(err instanceof Error ? err.message : `No se pudo subir ${file.name}`);
      }
    }
    setUploading(null);
    if (uploaded.length > 0) {
      onChange([...media, ...uploaded]);
    }
  }

  async function handleDelete(mediaId: string) {
    if (!confirm('¿Borrar esta foto/video?')) {
      return;
    }
    try {
      await deletePropertyMedia(propertyId, mediaId);
      const remaining = media.filter((item) => item.id !== mediaId);
      if (remaining.length > 0 && media.find((item) => item.id === mediaId)?.isCover) {
        remaining[0] = { ...remaining[0], isCover: true };
      }
      onChange(remaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    }
  }

  async function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const reordered = [...media];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setDragIndex(null);
    onChange(reordered.map((item, index) => ({ ...item, isCover: index === 0 })));
    try {
      await reorderPropertyMedia(
        propertyId,
        reordered.map((item) => item.id),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reordenar');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="w-fit cursor-pointer rounded border border-black/10 px-4 py-2 text-sm dark:border-white/15">
        {uploading ? `Subiendo ${uploading.current}/${uploading.total}…` : 'Agregar fotos/video'}
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          disabled={Boolean(uploading)}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {media.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="group relative aspect-square cursor-move overflow-hidden rounded border border-black/10 bg-black/5 dark:border-white/15 dark:bg-white/5"
            >
              {item.type === 'PHOTO' ? (
                <Image src={item.url} alt="" fill className="object-cover" unoptimized />
              ) : (
                <video src={item.url} className="h-full w-full object-cover" />
              )}
              {item.isCover && (
                <span className="absolute top-1 left-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Portada
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="absolute top-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
