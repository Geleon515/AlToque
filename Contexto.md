# AlToque — Contexto del proyecto para Claude Code

## ¿Qué es AlToque?

Marketplace bidireccional web que conecta clientes que necesitan servicios técnicos domésticos
con trabajadores independientes (gasfiteros, electricistas, personal de limpieza, carpinteros,
personal de mudanza) en Lima Metropolitana. MVP con lanzamiento en la Provincia Constitucional
del Callao.

La plataforma **no contrata ni subcontrata** técnicos. Solo facilita el encuentro entre ambas
partes de forma segura y transparente.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Estilos | Tailwind CSS v4 |
| Backend / BD | Supabase (PostgreSQL + PostGIS + Auth + Storage + Realtime) |
| Pagos | Culqi (sandbox, sin RUC) |
| Emails | Resend (3,000/mes gratis) |
| Hosting | Vercel Hobby |
| Mapas | Mapbox (capa gratuita) |

**No hay Spring Boot. Supabase cubre todo el backend.**
**Costo total MVP: S/ 0**

---

## Roles de usuario

### Cliente (Demanda)
- Acceso completamente gratuito
- Publica trabajos, revisa postulantes, hace match, califica al trabajador
- Tiene `avg_rating` y `total_reviews` (los trabajadores pueden ver su perfil antes de postular)

### Trabajador Técnico (Oferta)
- Plan **Básico** (gratuito): 2 postulaciones/día
- Plan **Premium** (S/ 15/mes): 5 postulaciones/día + notificaciones instantáneas +
  posicionamiento prioritario + portafolio ilimitado + insignia verificado
- Requiere verificación de identidad (DNI + biometría) antes de activar perfil público

---

## Flujo general del servicio

1. Cliente publica trabajo (categoría + descripción + fotos/videos + ubicación)
2. Sistema distribuye al feed geolocalizado de trabajadores con esa especialidad
3. Si no hay postulaciones en 30 min → radio se expande: 5 km → 10 km → 20 km (máx)
4. Trabajador ve el detalle, puede ver perfil básico del cliente y decide postular
5. Al postular, se habilita el chat para negociar precio, horario y alcance
6. Cliente revisa postulantes y acepta a uno → se crea el match
7. Publicación se cierra para los demás trabajadores
8. Trabajo avanza por estados: `accepted → on_the_way → in_progress → finished` (manual)
9. Ambos se califican mutuamente (obligatorio). Si en 48h ninguno reseña → sistema inserta
   5 estrellas sin comentario automáticamente

---

## Base de datos — Tablas principales

```
auth.users              — Supabase Auth (email, rol)
client_profiles         — nombre, teléfono, provincia, distrito, avg_rating, total_reviews, jobs_posted
worker_profiles         — nombre, DNI, bio, zona cobertura, location (geography), avg_rating, jobs_completed
categories              — 6 categorías fijas (Plomería, Electricidad, Limpieza, Carpintería, Mudanza, Otros)
worker_specialties      — relación trabajador-categoría (muchos a muchos)
worker_tags             — tags de especialidad (ej: "Tableros Eléctricos")
job_posts               — publicaciones del cliente, status, location (geography), current_radius_km
job_attachments         — fotos/videos de cada publicación (máx 5)
applications            — postulaciones de trabajadores
job_matches             — match aceptado, estados del seguimiento, scheduled_date, worker_notes
messages                — chat vinculado a la postulación (Supabase Realtime)
reviews                 — reseñas bidireccionales, is_default para las automáticas
subscriptions           — plan del trabajador (basic/premium), culqi_subscription_id
notifications           — tipo, título, body, leído/no leído (Supabase Realtime)
```

El schema SQL completo está en `altoque_schema.sql` en la raíz del proyecto.

---

## Funciones importantes en BD

| Función | Descripción |
|---|---|
| `get_nearby_jobs(location, radius_km, category_ids)` | Retorna trabajos cercanos al trabajador con distancia en km |
| `check_daily_application_limit(worker_id)` | Retorna TRUE si el trabajador puede postular hoy (2 básico / 5 premium) |
| `expand_job_radius()` | Expande radio de jobs sin postulaciones (ejecutar con pg_cron cada 5 min) |
| `insert_default_reviews()` | Inserta reseña 5★ automática si pasan 48h sin reseñar (pg_cron cada hora) |

---

## Decisiones de negocio confirmadas

- Postulaciones diarias: **2 básico / 5 premium** (modificable en `check_daily_application_limit`)
- Expansión de radio: **30 min sin postulaciones → 5→10→20 km** (máximo)
- Reseña por defecto: **5 estrellas sin comentario** tras 48h sin reseñar
- Cancelar match: **no implementado en MVP** (versión futura)
- Panel de administración: **no en MVP**
- Estados del seguimiento: **manuales** (el trabajador los cambia)
- Múltiples especialidades por trabajador: **sí permitido**
- Número de teléfono del cliente: **visible solo para el trabajador que hizo match** (RNF-08)
- Chat: **se habilita solo después de que el trabajador postule** (RNF-06)

---

## División de trabajo (quién hace qué)

### Persona 1 — Base + Auth + Landing (TÚ)
- Setup del proyecto React + TypeScript + Supabase
- Configurar tablas, RLS, PostGIS, Auth, Storage en Supabase
- Landing page pública
- Login y recuperación de contraseña
- Registro con selección de rol
- Flujo de registro del cliente
- Flujo de registro del trabajador (con carga de documentos)
- Verificación de identidad del trabajador
- Layout general (sidebar, navbar, iconos)

### Persona 2 — Módulo del cliente (publicación)
- Dashboard del cliente
- Publicar trabajo (3 pasos: categoría → detalles → ubicación)
- Pantalla "Mis publicaciones"
- Detalle de publicación activa
- Perfil del cliente

### Persona 3 — Candidatos + Match + Reseñas
- Lista de candidatos postulantes
- Perfil completo del trabajador postulante
- Aceptar trabajador (hacer match)
- Calificar trabajador / calificar cliente
- Reseñas obligatorias bidireccionales

### Persona 4 — Módulo del trabajador (feed + postulación + seguimiento)
- Dashboard del trabajador
- Feed filtrado por zona y especialidad (consultas PostGIS)
- Detalle de publicación
- Ver perfil del cliente antes de postular
- Postular (con validación de límite diario)
- Seguimiento de trabajo activo (estados manuales + scheduled_date)
- Múltiples trabajos activos simultáneos
- Perfil público del trabajador

### Persona 5 — Chat + Notificaciones + Suscripción
- Chat con Supabase Realtime
- Pantalla de mensajes (cliente y trabajador)
- Notificaciones dropdown
- Planes de suscripción (Básico vs Premium)
- Pago con Culqi sandbox
- Gestión de suscripción activa

---

## Requisitos No Funcionales clave

- Feed carga en < 2 segundos en 4G (RNF-01)
- Notificaciones push premium en < 5 segundos (RNF-02)
- Soportar 500 usuarios concurrentes en MVP (RNF-03)
- HTTPS con TLS 1.2+ obligatorio (RNF-04)
- Contraseñas hasheadas con bcrypt — Supabase lo maneja (RNF-05)
- Responsive desde 5 pulgadas — 92.8% del público accede desde móvil (RNF-09)
- Publicar trabajo: máximo 3 pasos (RNF-10)
- Registro cliente < 3 min, registro trabajador < 10 min (RNF-11)

---

## Convenciones de código

- **Lenguaje**: TypeScript estricto. Sin `any` explícito.
- **Componentes**: funcionales con hooks. Sin componentes de clase.
- **Estilos**: Tailwind CSS v4 únicamente. Sin CSS modules ni styled-components.
- **Cliente Supabase**: instancia única exportada desde `src/lib/supabase.ts`
- **Variables de entorno**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env`
- **Rutas**: React Router DOM v6. Rutas protegidas por rol en `src/router/`.
- **Estructura de carpetas**:

```
src/
  assets/          — imágenes, íconos estáticos
  components/      — componentes reutilizables
    ui/            — botones, inputs, modales genéricos
    layout/        — Navbar, Sidebar, Layout principal
  pages/           — una carpeta por página/módulo
    landing/
    auth/
    client/
    worker/
  lib/
    supabase.ts    — cliente Supabase
    types.ts       — tipos TypeScript del schema
  router/
    index.tsx      — definición de rutas
    ProtectedRoute.tsx
  hooks/           — custom hooks (useAuth, useProfile, etc.)
```

---

## Variables de entorno necesarias

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_CULQI_PUBLIC_KEY=pk_test_...
VITE_MAPBOX_TOKEN=pk.eyJ1...
VITE_RESEND_API_KEY=re_...
```

---

## Orden de ejecución del proyecto completo

| Semana | Actividad |
|---|---|
| Semana 1 | Persona 1 configura todo. Los demás avanzan con datos mock. |
| Semana 2 | Personas 2, 3 y 4 conectan a Supabase real en paralelo. |
| Semana 3 | Persona 5 integra chat y suscripción. Persona 4 conecta geolocalización. |
| Semana 4 | Testing, correcciones y demo. |

---

## Notas para el agente

- Antes de crear cualquier componente que consuma Supabase, verificar que el tipo
  correspondiente esté definido en `src/lib/types.ts`
- Las políticas RLS ya están configuradas en el schema. No bypassear con `service_role`
  salvo para las funciones de cron (expand_job_radius, insert_default_reviews)
- El Storage bucket para fotos/videos se llama `job-attachments` y es público para lectura
- Para geolocalización, los campos `location` son de tipo `GEOGRAPHY(POINT, 4326)`.
  Al insertar desde el frontend usar: `POINT(longitud latitud)` (longitud primero)
- Supabase Realtime ya está habilitado para `messages` y `notifications` en el schema
