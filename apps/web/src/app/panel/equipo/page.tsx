'use client';

import { useEffect, useState } from 'react';
import { createFranchiseInvite, getFranchiseMembers } from '@/lib/api';
import type { FranchiseMember } from '@/lib/types';
import { badgeNeutral, buttonPrimary, buttonSecondarySm, card } from '@/lib/ui';

const ROLE_LABELS: Record<FranchiseMember['role'], string> = {
  ADVISOR: 'Asesor',
  FRANCHISE_ADMIN: 'Admin de franquicia',
  SUPER_ADMIN: 'Super admin',
};

export default function PanelEquipoPage() {
  const [members, setMembers] = useState<FranchiseMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    getFranchiseMembers()
      .then(setMembers)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function handleInvite() {
    setInviting(true);
    try {
      const { token } = await createFranchiseInvite();
      setInviteLink(`${window.location.origin}/aceptar-invitacion?token=${token}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={handleInvite} disabled={inviting} className={`w-fit ${buttonPrimary}`}>
        {inviting ? 'Generando…' : 'Invitar asesor'}
      </button>

      {inviteLink && (
        <div className={`flex items-center gap-2 text-sm ${card}`}>
          <label className="sr-only" htmlFor="invite-link">
            Link de invitación
          </label>
          <input id="invite-link" readOnly value={inviteLink} className="flex-1 bg-transparent outline-none" />
          <button onClick={() => navigator.clipboard.writeText(inviteLink)} className={buttonSecondarySm}>
            Copiar
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !members && <p className="opacity-70">Cargando…</p>}

      {members && members.length > 0 && (
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <div key={member.id} className={`flex items-center justify-between ${card}`}>
              <div>
                <p className="font-medium">{member.fullName}</p>
                <p className="text-xs opacity-70">{member.email}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="opacity-70">{member._count.properties} propiedades</span>
                <span className={badgeNeutral}>{ROLE_LABELS[member.role]}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
