import { AcceptInviteForm } from '@/components/AcceptInviteForm';

export default async function AceptarInvitacionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Completar registro</h1>
      {token ? (
        <AcceptInviteForm token={token} />
      ) : (
        <p className="text-sm text-red-600">Falta el token de invitación en el link.</p>
      )}
    </main>
  );
}
