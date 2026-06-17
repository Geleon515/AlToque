# AlToque — Guía para integrantes

## Lo que ya está listo

| Área | Archivos |
|---|---|
| Auth completa | `LoginPage`, `RegisterPage`, `RegisterClientPage`, `RegisterWorkerPage` |
| Layout autenticado | `AppLayout`, `AppNavbar`, `SidebarClient`, `SidebarWorker` |
| Rutas base | `router/index.tsx` con rutas protegidas por rol |
| Hook de sesión | `useAuth()` en `src/hooks/useAuth.ts` |
| Tipos TypeScript | `src/lib/types.ts` |
| Cliente Supabase | `src/lib/supabase.ts` |
| Módulo del cliente (Persona 2) | `ClientDashboardPage`, `NewJobPage`, `ClientJobsPage`, `ClientProfilePage`, `ClientJobDetailPage` |

> El módulo del cliente está completo: dashboard, publicar trabajo (3 pasos con mapa y carga de fotos/videos), mis publicaciones, perfil y detalle de publicación. Las Personas 3, 4 y 5 ya pueden apoyarse en estas pantallas.

---

## Cómo agregar tu página

**1. Crea tu componente** en `src/pages/client/` o `src/pages/worker/`:

```tsx
// src/pages/client/MiPagina.tsx
export default function MiPagina() {
  return <div>Contenido aquí</div>
}
```

**2. Regístrala en el router** (`src/router/index.tsx`), dentro del grupo de tu rol:

```tsx
// Ejemplo para cliente
children: [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: 'dashboard', element: <ClientDashboardPage /> },
  { path: 'jobs',      element: <MiPagina /> },   // ← agrega aquí
  { path: '*',         element: <PlaceholderPage /> },
]
```

El `AppLayout` (sidebar + navbar) se hereda automáticamente. Solo escribes el contenido.

---

## useAuth() — qué te da

```ts
const { user, role, clientProfile, workerProfile, loading, signOut } = useAuth()
```

| Campo | Tipo | Útil para |
|---|---|---|
| `user` | `User \| null` | ID del usuario: `user.id` |
| `role` | `'client' \| 'worker' \| null` | Saber qué rol tiene |
| `clientProfile` | `ClientProfile \| null` | Nombre, distrito, teléfono del cliente |
| `workerProfile` | `WorkerProfile \| null` | Nombre, DNI, rating, identity_verified del trabajador |
| `loading` | `boolean` | Mostrar spinner mientras carga |
| `signOut` | `() => Promise<void>` | Cerrar sesión |

---

## Supabase — consultas frecuentes

```ts
import { supabase } from '../../lib/supabase'

// Leer
const { data, error } = await supabase
  .from('job_posts')
  .select('*')
  .eq('client_id', user.id)

// Insertar
await supabase.from('job_posts').insert({ client_id: user.id, ... })

// Actualizar
await supabase.from('job_posts').update({ status: 'finished' }).eq('id', jobId)
```

---

## Funciones de base de datos

### `get_nearby_jobs` — trabajos cercanos al trabajador
```ts
const { data } = await supabase.rpc('get_nearby_jobs', {
  worker_location: `POINT(${lng} ${lat})`,  // longitud primero
  radius_km: 5,
  worker_category_ids: [1, 2],  // null = todas las categorías
})
// Retorna: job_id, title, description, category_name, district,
//          distance_km, created_at, client_name, client_rating, applicant_count
```

### `check_daily_application_limit` — validar límite de postulaciones
```ts
const { data: canApply } = await supabase.rpc('check_daily_application_limit', {
  worker_id: user.id
})
// Retorna true si puede postular hoy (2 básico / 5 premium)
```

### Funciones automáticas (cron) — no se llaman desde el frontend
- `expand_job_radius()` — expande el radio de los trabajos sin postulantes (5 → 10 → 20 km) tras
  30 min de espera. Corre sola cada 5 min con pg_cron.
- `insert_default_reviews()` — *(pendiente, depende del flujo de match + reseñas de la Persona 3)*
  insertará reseña 5★ automática tras 48h sin calificar.

---

## Geolocalización

Los campos `location` son `GEOGRAPHY(POINT, 4326)`. Al insertar desde frontend:

```ts
// Formato: POINT(longitud latitud)  — longitud va primero
location: `POINT(${lng} ${lat})`
```

---

## Realtime — chat y notificaciones

```ts
// Suscribirse a mensajes nuevos de una postulación
supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `application_id=eq.${applicationId}`,
  }, (payload) => {
    // payload.new → mensaje nuevo
  })
  .subscribe()
```

Lo mismo aplica para `notifications` filtrando por `user_id=eq.${user.id}`.

---

## Storage — buckets disponibles

| Bucket | Privacidad | Uso |
|---|---|---|
| `avatars` | Público | Fotos de perfil de clientes y trabajadores |
| `job-attachments` | Público | Fotos/videos adjuntos a publicaciones de trabajo |
| `worker-documents` | Privado | DNI, antecedentes y certificados del trabajador |

> Los 3 buckets deben existir en Supabase > Storage. Si no están creados, pedirle a Gerardo que los cree.
> Las políticas de subida (INSERT) ya están configuradas para `avatars` y `job-attachments`,
> así que la carga de fotos/videos en publicaciones ya funciona.

```ts
// Subir/actualizar foto de perfil (bucket público)
const { data } = await supabase.storage
  .from('avatars')
  .upload(`${user.id}/avatar`, file, { upsert: true })

const avatarUrl = supabase.storage
  .from('avatars')
  .getPublicUrl(`${user.id}/avatar`).data.publicUrl

// Guardar la URL en el perfil
await supabase
  .from('client_profiles')       // o 'worker_profiles'
  .update({ avatar_url: avatarUrl })
  .eq('id', user.id)

// Subir foto de trabajo (bucket público)
const { data } = await supabase.storage
  .from('job-attachments')
  .upload(`${user.id}/${Date.now()}`, file)

const url = supabase.storage
  .from('job-attachments')
  .getPublicUrl(data.path).data.publicUrl
```

---

## Tokens de diseño

| Token | Valor |
|---|---|
| Primary | `#0D7B6B` |
| Primary light | `#E8F5F3` |
| Text dark | `#1A1A2E` |
| Text muted | `#6B7280` |
| Background | `#F8FAFC` |
| Error | `#EF4444` |

Usar **solo Tailwind CSS**. Sin CSS modules ni styled-components.

---

## Resumen por persona

| Persona | Rutas a crear | Tabla principal |
|---|---|---|
| 2 — Cliente (publicación) | `/client/new-job`, `/client/jobs`, `/client/jobs/:id`, `/client/profile` | `job_posts`, `job_attachments` |
| 3 — Candidatos + Match | Dentro de `ClientJobDetailPage` (`/client/jobs/:id`) | `applications`, `job_matches`, `reviews` |
| 4 — Trabajador (feed) | `/worker/jobs`, `/worker/tracking`, `/worker/profile` | `job_posts` (RPC), `job_matches` |
| 5 — Chat + Notificaciones | `/worker/messages`, `/client/messages`, `/worker/subscription` | `messages`, `notifications`, `subscriptions` |

> **Nota para la Persona 3:** la pantalla de detalle (`ClientJobDetailPage`) ya muestra la lista
> de candidatos postulantes con su nombre, foto, verificación y rating. Falta agregar ahí el botón
> de **aceptar / hacer match** (crear el registro en `job_matches`). El botón "Ver mensaje" de cada
> candidato ya navega a `/client/messages?application=<id>` para que la Persona 5 lo conecte al chat.
