-- Secuencia atómica para el round-robin de asignación de leads entre ejecutivas
-- Evita race conditions cuando varios leads llegan simultáneamente

CREATE SEQUENCE IF NOT EXISTS lead_round_robin_seq
  START WITH 0
  MINVALUE 0
  NO MAXVALUE
  CYCLE;

-- Función para obtener el siguiente valor de forma atómica
CREATE OR REPLACE FUNCTION next_round_robin_position()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT (nextval('lead_round_robin_seq') % 3)::integer;
$$;
