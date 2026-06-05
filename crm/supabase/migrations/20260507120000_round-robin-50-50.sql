-- Cambia el round-robin de 2:1 a 1:1 (Susan y Camila al 50%)
CREATE OR REPLACE FUNCTION next_round_robin_position()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT (nextval('lead_round_robin_seq') % 2)::integer;
$$;
