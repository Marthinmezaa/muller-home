'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PropertyForm } from '@/components/PropertyForm';
import { PropertyMediaManager } from '@/components/PropertyMediaManager';
import {
  closeProperty,
  getManagedProperty,
  pauseProperty,
  publishProperty,
  reactivateProperty,
  requestPropertyDeletion,
  updateProperty,
} from '@/lib/api';
import { PROPERTY_STATUS_LABELS, type Property, type PropertyInput } from '@/lib/types';
import { badgeNeutral, buttonDanger, buttonPrimarySm, buttonSecondarySm } from '@/lib/ui';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; property: Property };

export default function EditarPropiedadPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    getManagedProperty(id)
      .then((property) =>
        setState(property ? { kind: 'ready', property } : { kind: 'error', message: 'Propiedad no encontrada.' }),
      )
      .catch((err) =>
        setState({ kind: 'error', message: err instanceof Error ? err.message : 'No se pudo cargar la propiedad.' }),
      );
  }, [id]);

  if (state.kind === 'loading') {
    return <p className="opacity-70">Cargando…</p>;
  }
  if (state.kind === 'error') {
    return <p className="text-sm text-red-600">{state.message}</p>;
  }

  const { property } = state;

  async function handleSave(input: PropertyInput) {
    const updated = await updateProperty(property.id, input);
    setState({ kind: 'ready', property: { ...property, ...updated } });
  }

  async function runAction(action: () => Promise<Property>) {
    setActionError('');
    try {
      const updated = await action();
      setState({ kind: 'ready', property: { ...property, ...updated } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo actualizar el estado');
    }
  }

  async function handleRequestDeletion() {
    setActionError('');
    try {
      await requestPropertyDeletion(property.id);
      setActionError('Baja solicitada. Avisá al administrador por WhatsApp para que la revise.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo pedir la baja');
    }
  }

  const closeLabel = property.operationType === 'SALE' ? 'Marcar como vendida' : 'Marcar como alquilada';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{property.title || 'Editar propiedad'}</h1>
        <span className={badgeNeutral}>{PROPERTY_STATUS_LABELS[property.status]}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {property.status === 'DRAFT' && (
          <button onClick={() => runAction(() => publishProperty(property.id))} className={buttonPrimarySm}>
            Publicar
          </button>
        )}
        {property.status === 'PUBLISHED' && (
          <>
            <button onClick={() => runAction(() => pauseProperty(property.id))} className={buttonSecondarySm}>
              Pausar
            </button>
            <button onClick={() => runAction(() => closeProperty(property.id))} className={buttonSecondarySm}>
              {closeLabel}
            </button>
          </>
        )}
        {property.status === 'PAUSED' && (
          <button onClick={() => runAction(() => reactivateProperty(property.id))} className={buttonPrimarySm}>
            Reactivar
          </button>
        )}
        <button onClick={handleRequestDeletion} className={buttonDanger}>
          Pedir baja
        </button>
      </div>
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      <section>
        <h2 className="mb-2 font-medium">Fotos y video</h2>
        <PropertyMediaManager
          propertyId={property.id}
          media={property.media}
          onChange={(media) => setState({ kind: 'ready', property: { ...property, media } })}
        />
      </section>

      <section>
        <h2 className="mb-2 font-medium">Datos</h2>
        <PropertyForm
          initial={{
            title: property.title,
            description: property.description,
            operationType: property.operationType,
            propertyType: property.propertyType,
            price: Number(property.price),
            areaM2: Number(property.areaM2),
            rooms: property.rooms,
            bathrooms: property.bathrooms,
            address: property.address,
            city: property.city,
            lat: Number(property.lat),
            lng: Number(property.lng),
          }}
          onSubmit={handleSave}
          submitLabel="Guardar cambios"
        />
      </section>
    </div>
  );
}
