#!/bin/bash
# Script de exportación de datos desde Supabase (Lovable)
# Ejecutar: bash migrate/export.sh

SOURCE_URL="REDACTED"
SOURCE_KEY="REDACTED"
OUTPUT_DIR="migrate/data"

mkdir -p "$OUTPUT_DIR"

TABLES=(
  "profiles"
  "user_roles"
  "leads"
  "call_attempts"
  "app_settings"
  "lead_notes"
  "tasks"
  "projects"
  "daily_performance"
  "incoming_calls"
  "manual_calls"
  "email_queue"
)

echo "Exportando tablas..."

for TABLE in "${TABLES[@]}"; do
  echo -n "  → $TABLE... "
  curl -s "$SOURCE_URL/rest/v1/$TABLE?select=*" \
    -H "apikey: $SOURCE_KEY" \
    -H "Authorization: Bearer $SOURCE_KEY" \
    -H "Prefer: count=exact" \
    > "$OUTPUT_DIR/$TABLE.json"

  COUNT=$(cat "$OUTPUT_DIR/$TABLE.json" | python3 -c "import sys,json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 'error')" 2>/dev/null)
  echo "$COUNT registros"
done

echo ""
echo "Exportación completa. Archivos en: $OUTPUT_DIR/"
