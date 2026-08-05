# Muller Home — apps/web

Portal público (buscador, filtros, ficha) que consume la API en `apps/api`.

## Variables de entorno

Crear un `.env.local` (no versionado) con:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Si se omite, usa `http://localhost:3001` por default.

## Desarrollo

```bash
npm run dev --workspace=@muller-home/web
```

Requiere `apps/api` corriendo (ver su propio README/CLAUDE.md) para tener datos reales.

Abrir [http://localhost:3000](http://localhost:3000).
