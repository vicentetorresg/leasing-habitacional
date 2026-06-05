-- Policies para autorizar subscripciones de Realtime en nuevos proyectos Supabase
CREATE POLICY "Allow authenticated users to receive realtime on leads"
ON realtime.messages
FOR SELECT
TO authenticated
USING (realtime.topic() = 'realtime:public:leads');
