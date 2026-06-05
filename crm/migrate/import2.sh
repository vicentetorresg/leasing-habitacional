#!/bin/bash
# Importa lead_notes, call_attempts, tasks filtrando solo leads que existen

DEST_URL="https://bzmzuoxapedvxmqcnhqq.supabase.co"
DEST_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bXp1b3hhcGVkdnhtcWNuaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxNDM3NSwiZXhwIjoyMDkwNzkwMzc1fQ.PSxmllwNWogKtqYUdlBbxAnPiJzt4aya-Wr9vTuSPpM"
DATA_DIR="migrate/data"

echo "Obteniendo IDs de leads existentes en nuevo proyecto..."
EXISTING_LEADS=$(curl -s "$DEST_URL/rest/v1/leads?select=id" \
  -H "apikey: $DEST_KEY" \
  -H "Authorization: Bearer $DEST_KEY")

echo "Leads en nuevo proyecto: $(echo $EXISTING_LEADS | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')"

# Filtrar e insertar cada tabla
for TABLE in lead_notes call_attempts tasks incoming_calls; do
  echo -n "Filtrando $TABLE... "
  FILTERED=$(python3 -c "
import json, sys

existing = {r['id'] for r in json.loads('''$EXISTING_LEADS''')}
records = json.load(open('$DATA_DIR/$TABLE.json'))
filtered = [r for r in records if r.get('lead_id') in existing]
print(json.dumps(filtered))
" 2>/dev/null)

  COUNT=$(echo $FILTERED | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
  echo "$COUNT registros con lead válido"

  if [ "$COUNT" -gt "0" ]; then
    RESULT=$(curl -s -X POST "$DEST_URL/rest/v1/$TABLE" \
      -H "apikey: $DEST_KEY" \
      -H "Authorization: Bearer $DEST_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: resolution=merge-duplicates,return=minimal" \
      -d "$FILTERED")
    if [ -z "$RESULT" ]; then
      echo "  ✓ $TABLE: importado"
    else
      echo "  ✗ $TABLE: $RESULT" | head -c 200
    fi
  fi
done

echo ""
echo "Verificación final:"
for TABLE in leads lead_notes call_attempts tasks daily_performance; do
  COUNT=$(curl -s "$DEST_URL/rest/v1/$TABLE?select=count" \
    -H "apikey: $DEST_KEY" \
    -H "Authorization: Bearer $DEST_KEY" \
    -H "Prefer: count=exact" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['count'] if d else 0)")
  echo "  $TABLE: $COUNT registros"
done
