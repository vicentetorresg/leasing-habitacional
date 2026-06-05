-- Tracking de traspaso Susan → Camila
-- transferred_from_susan: marca permanente de que este lead fue traspasado alguna vez
-- camila_notes_hidden_since: timestamp del traspaso; Camila solo ve notas/tareas DESDE esta fecha

alter table leads
  add column if not exists transferred_from_susan boolean not null default false,
  add column if not exists camila_notes_hidden_since timestamptz;
