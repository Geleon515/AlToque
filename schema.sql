-- ============================================
-- AlToque — Schema completo para Supabase
-- ============================================

-- Activar PostGIS para geolocalización
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- 1. TABLAS BASE
-- ============================================

-- Perfiles de cliente
CREATE TABLE client_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  province TEXT NOT NULL DEFAULT 'Callao',
  district TEXT NOT NULL,
  address TEXT,
  avg_rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  total_reviews INT NOT NULL DEFAULT 0,
  jobs_posted INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfiles de trabajador
CREATE TABLE worker_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  dni TEXT UNIQUE NOT NULL,
  bio TEXT,
  coverage_zone TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  ruc_verified BOOLEAN NOT NULL DEFAULT false,
  identity_verified BOOLEAN NOT NULL DEFAULT false,
  avg_rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  total_reviews INT NOT NULL DEFAULT 0,
  jobs_completed INT NOT NULL DEFAULT 0,
  dni_doc_path TEXT,
  antecedentes_doc_path TEXT,
  certificados_doc_paths TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categorías de servicio (datos fijos)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT
);

INSERT INTO categories (name, icon) VALUES
  ('Plomería', 'wrench'),
  ('Electricidad', 'zap'),
  ('Limpieza', 'sparkles'),
  ('Carpintería', 'hammer'),
  ('Mudanza', 'truck'),
  ('Otros Servicios', 'more-horizontal');

-- Especialidades del trabajador (muchos a muchos)
CREATE TABLE worker_specialties (
  id SERIAL PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE(worker_id, category_id)
);

-- Tags de especialidad del trabajador (ej: "Tableros Eléctricos", "Iluminación LED")
CREATE TABLE worker_tags (
  id SERIAL PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL
);

-- ============================================
-- 2. PUBLICACIONES Y POSTULACIONES
-- ============================================

-- Publicaciones de trabajo del cliente
CREATE TABLE job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id),
  title TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'matched', 'finished', 'cancelled')),
  province TEXT NOT NULL DEFAULT 'Callao',
  district TEXT NOT NULL,
  address TEXT,
  location GEOGRAPHY(POINT, 4326),
  current_radius_km INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Archivos adjuntos de publicaciones (fotos/videos, máx 5)
CREATE TABLE job_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Postulaciones de trabajadores
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_post_id, worker_id)
);

-- ============================================
-- 3. MATCH Y SEGUIMIENTO
-- ============================================

-- Match: se crea cuando el cliente acepta un trabajador
CREATE TABLE job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID UNIQUE NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id),
  agreed_price NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'accepted'
    CHECK (status IN ('accepted', 'on_the_way', 'in_progress', 'finished')),
  scheduled_date TIMESTAMPTZ,
  worker_notes TEXT,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  arrival_location_verified BOOLEAN,
  client_confirmed_arrival BOOLEAN
);

-- ============================================
-- 4. CHAT
-- ============================================

-- Mensajes entre cliente y trabajador (vinculado a postulación)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 5. RESEÑAS
-- ============================================

-- Reseñas bidireccionales (cada match genera 2)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_match_id UUID NOT NULL REFERENCES job_matches(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  reviewed_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_match_id, reviewer_id)
);

-- ============================================
-- 6. SUSCRIPCIONES
-- ============================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID UNIQUE NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  culqi_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 7. NOTIFICACIONES
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_application', 'job_finished', 'new_message', 'match_accepted', 'review_pending')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 8. ÍNDICES
-- ============================================

-- Geolocalización
CREATE INDEX idx_job_posts_location ON job_posts USING GIST (location);
CREATE INDEX idx_worker_profiles_location ON worker_profiles USING GIST (location);

-- Búsquedas frecuentes
CREATE INDEX idx_job_posts_status ON job_posts(status);
CREATE INDEX idx_job_posts_client ON job_posts(client_id);
CREATE INDEX idx_job_posts_category ON job_posts(category_id);
CREATE INDEX idx_applications_job ON applications(job_post_id);
CREATE INDEX idx_applications_worker ON applications(worker_id);
CREATE INDEX idx_messages_application ON messages(application_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_reviews_reviewed ON reviews(reviewed_id);
CREATE INDEX idx_worker_specialties_worker ON worker_specialties(worker_id);
CREATE INDEX idx_worker_specialties_category ON worker_specialties(category_id);

-- ============================================
-- 9. FUNCIONES ÚTILES
-- ============================================

-- Buscar trabajos cercanos al trabajador (distancia en km)
CREATE OR REPLACE FUNCTION get_nearby_jobs(
  worker_location GEOGRAPHY,
  radius_km INT DEFAULT 5,
  worker_category_ids INT[] DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  title TEXT,
  description TEXT,
  category_name TEXT,
  district TEXT,
  distance_km NUMERIC,
  created_at TIMESTAMPTZ,
  client_name TEXT,
  client_rating NUMERIC,
  applicant_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jp.id AS job_id,
    jp.title,
    jp.description,
    c.name AS category_name,
    jp.district,
    ROUND((ST_Distance(jp.location, worker_location) / 1000)::NUMERIC, 1) AS distance_km,
    jp.created_at,
    cp.full_name AS client_name,
    cp.avg_rating AS client_rating,
    (SELECT COUNT(*) FROM applications a WHERE a.job_post_id = jp.id) AS applicant_count
  FROM job_posts jp
  JOIN categories c ON c.id = jp.category_id
  JOIN client_profiles cp ON cp.id = jp.client_id
  WHERE jp.status = 'active'
    AND ST_DWithin(jp.location, worker_location, radius_km * 1000)
    AND (worker_category_ids IS NULL OR jp.category_id = ANY(worker_category_ids))
  ORDER BY distance_km ASC, jp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Obtener coordenadas exactas de un trabajo
CREATE OR REPLACE FUNCTION get_job_coordinates(job_id_param UUID)
RETURNS JSON AS $$
DECLARE
  lng NUMERIC;
  lat NUMERIC;
BEGIN
  SELECT ST_X(location::geometry), ST_Y(location::geometry)
  INTO lng, lat
  FROM job_posts
  WHERE id = job_id_param;
  
  IF lng IS NULL OR lat IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object('lng', lng, 'lat', lat);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validar si el trabajador puede postular hoy (2 básico / 5 premium)
-- Cuenta las postulaciones del día (hora de Lima) y las compara con el límite del plan
CREATE OR REPLACE FUNCTION check_daily_application_limit(worker_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  worker_plan TEXT;
  daily_limit INT;
  today_count INT;
BEGIN
  -- Plan activo del trabajador (si no tiene suscripción, se asume 'basic')
  SELECT plan INTO worker_plan
  FROM subscriptions s
  WHERE s.worker_id = check_daily_application_limit.worker_id
    AND s.status = 'active'
  LIMIT 1;

  IF worker_plan = 'premium' THEN
    daily_limit := 5;
  ELSE
    daily_limit := 2;
  END IF;

  -- Postulaciones hechas hoy (día calendario de Lima)
  SELECT COUNT(*) INTO today_count
  FROM applications a
  WHERE a.worker_id = check_daily_application_limit.worker_id
    AND (a.applied_at AT TIME ZONE 'America/Lima') >= date_trunc('day', now() AT TIME ZONE 'America/Lima');

  RETURN today_count < daily_limit;
END;
$$ LANGUAGE plpgsql;

-- Actualizar rating promedio del trabajador después de una reseña
CREATE OR REPLACE FUNCTION update_worker_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE worker_profiles
  SET
    avg_rating = (
      SELECT ROUND(AVG(rating)::NUMERIC, 1)
      FROM reviews
      WHERE reviewed_id = NEW.reviewed_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE reviewed_id = NEW.reviewed_id
    )
  WHERE id = NEW.reviewed_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_worker_rating
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_worker_rating();

-- Actualizar rating promedio del cliente después de una reseña
-- (se dispara junto con el trigger del trabajador; solo afecta la fila que coincide,
--  porque reviewed_id apunta a un cliente O a un trabajador, no a ambos)
CREATE OR REPLACE FUNCTION update_client_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE client_profiles
  SET
    avg_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0)
      FROM reviews
      WHERE reviewed_id = NEW.reviewed_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE reviewed_id = NEW.reviewed_id
    )
  WHERE id = NEW.reviewed_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_rating
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_client_rating();

-- Actualizar trabajos completados del trabajador
CREATE OR REPLACE FUNCTION update_worker_jobs_completed()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE worker_profiles
  SET jobs_completed = (
    SELECT COUNT(*)
    FROM job_matches
    WHERE worker_id = NEW.worker_id AND status = 'finished'
  )
  WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_worker_jobs
AFTER UPDATE OF status ON job_matches
FOR EACH ROW
WHEN (NEW.status = 'finished' AND OLD.status IS DISTINCT FROM 'finished')
EXECUTE FUNCTION update_worker_jobs_completed();

-- Mantener jobs_posted del cliente (+1 por cada publicación creada)
CREATE OR REPLACE FUNCTION increment_jobs_posted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE client_profiles
  SET jobs_posted = jobs_posted + 1
  WHERE id = NEW.client_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_jobs_posted
AFTER INSERT ON job_posts
FOR EACH ROW
EXECUTE FUNCTION increment_jobs_posted();

-- Actualizar updated_at en job_posts
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_job_posts_updated
BEFORE UPDATE ON job_posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Expandir el radio de los trabajos activos sin postulantes (5 → 10 → 20 km)
-- Solo expande si pasaron 30 min desde el último cambio (updated_at) y no hay postulaciones.
-- Pensada para correr con pg_cron cada 5 min. SECURITY DEFINER para saltar RLS (tarea de mantenimiento).
CREATE OR REPLACE FUNCTION expand_job_radius()
RETURNS void AS $$
BEGIN
  UPDATE job_posts jp
  SET current_radius_km = CASE WHEN jp.current_radius_km < 10 THEN 10 ELSE 20 END
  WHERE jp.status = 'active'
    AND jp.current_radius_km < 20
    AND jp.updated_at < now() - INTERVAL '30 minutes'
    AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.job_post_id = jp.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Client profiles: cada uno ve y edita solo el suyo
CREATE POLICY "client_own_profile" ON client_profiles
  FOR ALL USING (auth.uid() = id);

-- El trabajador necesita ver el perfil del cliente al abrir el detalle de un
-- trabajo (nombre, rating, distrito, etc.). La política de arriba solo deja que
-- el propio cliente se vea a sí mismo, por lo que el join client_profiles(*)
-- devolvía 0 filas y el detalle salía vacío. Esta política permite leer el
-- perfil de un cliente cuando hay una relación legítima: tiene un trabajo
-- activo, o el trabajador ya postuló a alguno de sus trabajos.
-- Nota (RNF-08): expone toda la fila, incluido phone. En el MVP el teléfono se
-- oculta en el frontend hasta el match; la restricción por columna queda pendiente.
CREATE POLICY "worker_see_related_client" ON client_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM job_posts jp
      WHERE jp.client_id = client_profiles.id
        AND (
          jp.status = 'active'
          OR EXISTS (
            SELECT 1 FROM applications a
            WHERE a.job_post_id = jp.id
              AND a.worker_id = auth.uid()
          )
        )
    )
  );

-- Worker profiles: todos pueden ver, solo el dueño edita
CREATE POLICY "worker_profile_read" ON worker_profiles
  FOR SELECT USING (true);
CREATE POLICY "worker_profile_write" ON worker_profiles
  FOR ALL USING (auth.uid() = id);

-- Función Security Definer para evitar recursividad en RLS de job_posts
CREATE OR REPLACE FUNCTION has_applied_to_job(job_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM applications 
    WHERE job_post_id = job_id AND worker_id = user_id
  );
$$;

-- Job posts: clientes ven los suyos, trabajadores ven los activos o a los que postularon
CREATE POLICY "client_own_jobs" ON job_posts
  FOR ALL USING (auth.uid() = client_id);
CREATE POLICY "worker_see_active_jobs" ON job_posts
  FOR SELECT USING (status = 'active');
CREATE POLICY "worker_see_applied_jobs" ON job_posts
  FOR SELECT USING (has_applied_to_job(id, auth.uid()));

-- Attachments: visibles si puedes ver el job_post
CREATE POLICY "attachments_read" ON job_attachments
  FOR SELECT USING (true);
CREATE POLICY "attachments_write" ON job_attachments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM job_posts WHERE id = job_post_id AND client_id = auth.uid())
  );

-- Applications: trabajador ve las suyas, cliente ve las de sus publicaciones
CREATE POLICY "worker_own_applications" ON applications
  FOR ALL USING (auth.uid() = worker_id);
CREATE POLICY "client_see_applications" ON applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM job_posts WHERE id = job_post_id AND client_id = auth.uid())
  );

-- Messages: solo los participantes del chat
CREATE POLICY "message_participants" ON messages
  FOR ALL USING (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_id
      AND (a.worker_id = auth.uid()
        OR EXISTS (SELECT 1 FROM job_posts jp WHERE jp.id = a.job_post_id AND jp.client_id = auth.uid()))
    )
  );

-- Reviews: todos pueden leer, solo el reviewer escribe
CREATE POLICY "reviews_read" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_write" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Subscriptions: solo el trabajador ve la suya
CREATE POLICY "own_subscription" ON subscriptions
  FOR ALL USING (auth.uid() = worker_id);

-- Notifications: solo el usuario ve las suyas
CREATE POLICY "own_notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Job matches: el trabajador y el cliente del job_post pueden leer/crear el match.
-- NOTA: RLS estaba activo sin ninguna política → todo INSERT/SELECT era bloqueado.
CREATE POLICY "match_participants" ON job_matches
  FOR ALL USING (
    auth.uid() = worker_id
    OR EXISTS (
      SELECT 1 FROM job_posts jp
      WHERE jp.id = job_post_id AND jp.client_id = auth.uid()
    )
  );

-- Categories: lectura pública
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read" ON categories FOR SELECT USING (true);

-- Worker specialties: lectura pública, escritura del dueño
ALTER TABLE worker_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "specialties_read" ON worker_specialties FOR SELECT USING (true);
CREATE POLICY "specialties_write" ON worker_specialties
  FOR ALL USING (auth.uid() = worker_id);

-- Worker tags: lectura pública, escritura del dueño
ALTER TABLE worker_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_read" ON worker_tags FOR SELECT USING (true);
CREATE POLICY "tags_write" ON worker_tags
  FOR ALL USING (auth.uid() = worker_id);

-- ============================================
-- 11. REALTIME (habilitar para chat y notificaciones)
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- 12. STORAGE — Buckets y políticas
-- ============================================
-- IMPORTANTE: Los buckets deben crearse manualmente en el
-- dashboard de Supabase > Storage > New bucket:
--   · avatars          → público   (Public bucket: ON)
--   · job-attachments  → público   (Public bucket: ON)
--   · worker-documents → privado   (Public bucket: OFF)

-- Políticas para worker-documents (bucket privado)
CREATE POLICY "worker_upload_own_docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'worker-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "worker_read_own_docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'worker-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Políticas para avatars (bucket público)
CREATE POLICY "avatars_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Políticas para job-attachments (bucket público)
-- Nota: los archivos se guardan en la ruta jobs/{client_id}/{job_id}/..., por eso
-- la subida no valida carpeta (eso lo controla el RLS de la tabla job_attachments).
CREATE POLICY "job_attachments_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-attachments');

CREATE POLICY "job_attachments_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'job-attachments');