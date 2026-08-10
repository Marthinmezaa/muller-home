'use client';

import { useEffect, useState } from 'react';
import { createFranchiseInvite, getFranchiseMembers } from '@/lib/api';
import type { FranchiseMember } from '@/lib/types';

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
      <button
        onClick={handleInvite}
        disabled={inviting}
        className="w-fit rounded bg-[#3B3A72] px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {inviting ? 'Generando…' : 'Invitar asesor'}
      </button>

      {inviteLink && (
        <div className="flex items-center gap-2 rounded border border-black/10 p-3 text-sm dark:border-white/15">
          <input readOnly value={inviteLink} className="flex-1 bg-transparent outline-none" />
          <button
            onClick={() => navigator.clipboard.writeText(inviteLink)}
            className="rounded border border-black/10 px-2 py-1 text-xs dark:border-white/15"
          >
            Copiar
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !members && <p className="opacity-70">Cargando…</p>}

      {members && members.length > 0 && (
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded border border-black/10 p-4 dark:border-white/15">
              <div>
                <p className="font-medium">{member.fullName}</p>
                <p className="text-xs opacity-70">{member.email}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="opacity-70">{member._count.properties} propiedades</span>
                <span className="rounded bg-black/5 px-2 py-1 text-xs font-medium dark:bg-white/10">
                  {ROLE_LABELS[member.role]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
