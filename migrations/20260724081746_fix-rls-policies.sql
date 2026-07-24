-- Helper function to get current user's role and cafe_id
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'worker');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_cafe_id()
RETURNS uuid AS $$
DECLARE
  v_cafe_id uuid;
BEGIN
  SELECT cafe_id INTO v_cafe_id FROM public.users WHERE id = auth.uid();
  RETURN v_cafe_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Fix users policies
DROP POLICY IF EXISTS "user_select_policy" ON public.users;
CREATE POLICY "user_select_policy" ON public.users FOR SELECT
  USING (
    (role = 'admin'::user_role) OR
    (role = 'worker'::user_role AND (
      id = auth.uid() OR cafe_id = current_user_cafe_id()
    ))
  );

-- Fix stations policies
DROP POLICY IF EXISTS "station_select_policy" ON public.stations;
CREATE POLICY "station_select_policy" ON public.stations FOR SELECT
  USING (
    (current_user_role() = 'admin'::user_role) OR
    (cafe_id = current_user_cafe_id())
  );

DROP POLICY IF EXISTS "station_insert_policy" ON public.stations;
CREATE POLICY "station_insert_policy" ON public.stations FOR INSERT
  WITH CHECK (
    current_user_role() = 'admin'::user_role OR cafe_id = current_user_cafe_id()
  );

DROP POLICY IF EXISTS "station_update_policy" ON public.stations;
CREATE POLICY "station_update_policy" ON public.stations FOR UPDATE
  USING (
    (current_user_role() = 'admin'::user_role) OR
    (cafe_id = current_user_cafe_id())
  )
  WITH CHECK (
    (current_user_role() = 'admin'::user_role) OR
    (cafe_id = current_user_cafe_id())
  );

DROP POLICY IF EXISTS "station_delete_policy" ON public.stations;
CREATE POLICY "station_delete_policy" ON public.stations FOR DELETE
  USING (
    (current_user_role() = 'admin'::user_role) OR
    (cafe_id = current_user_cafe_id())
  );

-- Fix products policies
DROP POLICY IF EXISTS "product_select_policy" ON public.products;
CREATE POLICY "product_select_policy" ON public.products FOR SELECT
  USING (
    (current_user_role() = 'admin'::user_role) OR
    (cafe_id = current_user_cafe_id())
  );

DROP POLICY IF EXISTS "product_insert_policy" ON public.products;
CREATE POLICY "product_insert_policy" ON public.products FOR INSERT
  WITH CHECK (
    current_user_role() = 'admin'::user_role OR cafe_id = current_user_cafe_id()
  );

DROP POLICY IF EXISTS "product_update_policy" ON public.products;
CREATE POLICY "product_update_policy" ON public.products FOR UPDATE
  USING (
    (current_user_role() = 'admin'::user_role) OR
    (cafe_id = current_user_cafe_id())
  )
  WITH CHECK (
    (current_user_role() = 'admin'::user_role) OR
    (cafe_id = current_user_cafe_id())
  );

DROP POLICY IF EXISTS "product_delete_policy" ON public.products;
CREATE POLICY "product_delete_policy" ON public.products FOR DELETE
  USING (
    (current_user_role() = 'admin'::user_role) OR
    (cafe_id = current_user_cafe_id())
  );
