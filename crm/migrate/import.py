#!/usr/bin/env python3
"""
Script de importación de datos al nuevo proyecto Supabase.
Ejecutar: python3 migrate/import.py
"""

import json
import subprocess

DEST_URL = "https://bzmzuoxapedvxmqcnhqq.supabase.co"
DEST_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bXp1b3hhcGVkdnhtcWNuaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxNDM3NSwiZXhwIjoyMDkwNzkwMzc1fQ.PSxmllwNWogKtqYUdlBbxAnPiJzt4aya-Wr9vTuSPpM"
DATA_DIR = "migrate/data"

# Usuarios de auth con sus IDs originales
AUTH_USERS = [
    {"id": "60e55786-16ae-4a6b-a231-70988f10c58d", "email": "roniel.galvis@proppi.cl"},
    {"id": "08fcf2f0-bed1-4945-b023-73281e82d666", "email": "demo@demo.cl"},
    {"id": "4b3ed018-de52-439e-b49f-525e02f986b3", "email": "cristobal.sepulveda@proppi.cl"},
    {"id": "99586275-5294-48bb-9601-bba84706bf15", "email": "matias.bertelsen@proppi.cl"},
    {"id": "a1059973-c3c9-4d9f-971f-1ddc74ab2baf", "email": "diego.sanchez@proppi.cl"},
    {"id": "a945b0d6-f58b-4841-9238-d647741573c4", "email": "clemente.valenzuela@proppi.cl"},
    {"id": "77c9ed99-4976-44a8-b4e5-a2e9e49828b0", "email": "susan.petersen@proppi.cl"},
    {"id": "fb2ee47a-a0e1-4275-99d3-89a5f88d682e", "email": "vicente.torres@proppi.cl"},
]

def request(method, url, data=None, extra_headers=[]):
    cmd = [
        "curl", "-s", "-X", method, url,
        "-H", f"apikey: {DEST_KEY}",
        "-H", f"Authorization: Bearer {DEST_KEY}",
        "-H", "Content-Type: application/json",
        "-H", "Prefer: resolution=merge-duplicates,return=minimal",
    ]
    for h in extra_headers:
        cmd += ["-H", h]
    if data is not None:
        cmd += ["-d", json.dumps(data)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.stdout.strip():
        try:
            return json.loads(result.stdout)
        except:
            return {"raw": result.stdout}
    return {}

def insert_table(table, records, one_by_one=False):
    if not records:
        print(f"  → {table}: vacía, skip")
        return
    url = f"{DEST_URL}/rest/v1/{table}"
    if not one_by_one:
        result = request("POST", url, records)
        if isinstance(result, dict) and ("error" in result or "message" in result):
            msg = result.get("message") or result.get("error", "")
            print(f"  ✗ {table}: {str(msg)[:200]}")
        else:
            print(f"  ✓ {table}: {len(records)} registros importados")
    else:
        ok, skipped = 0, 0
        for rec in records:
            result = request("POST", url, rec)
            if isinstance(result, dict) and ("error" in result or "message" in result):
                skipped += 1
            else:
                ok += 1
        print(f"  ✓ {table}: {ok} importados, {skipped} duplicados omitidos")

def load(table):
    with open(f"{DATA_DIR}/{table}.json") as f:
        return json.load(f)

# ── 1. Crear usuarios de Auth (manteniendo los mismos IDs) ──────────────────
print("\n[1/2] Creando usuarios de Auth...")
for user in AUTH_USERS:
    result = request("POST", f"{DEST_URL}/auth/v1/admin/users", {
        "id": user["id"],
        "email": user["email"],
        "password": "Temporal123!",
        "email_confirm": True
    })
    if isinstance(result, dict) and ("error" in result or "msg" in result or "message" in result):
        err = str(result.get("msg") or result.get("message") or result.get("error", ""))
        if "already exists" in err or "already been registered" in err or "already registered" in err:
            print(f"  → {user['email']}: ya existe")
        else:
            print(f"  ✗ {user['email']}: {err[:150]}")
    else:
        print(f"  ✓ {user['email']}: creado")

# ── 2. Importar tablas en orden (respetando FKs) ────────────────────────────
print("\n[2/2] Importando tablas...")

# Sin dependencias
insert_table("app_settings", load("app_settings"))
insert_table("projects", load("projects"), one_by_one=True)

# Dependen de auth.users
insert_table("profiles", load("profiles"))
insert_table("user_roles", load("user_roles"))

# Dependen de profiles/projects
insert_table("leads", load("leads"), one_by_one=True)

# Dependen de leads
insert_table("lead_notes", load("lead_notes"), one_by_one=True)
insert_table("call_attempts", load("call_attempts"), one_by_one=True)
insert_table("tasks", load("tasks"), one_by_one=True)
insert_table("daily_performance", load("daily_performance"))
insert_table("incoming_calls", load("incoming_calls"))
insert_table("manual_calls", load("manual_calls"))
insert_table("email_queue", load("email_queue"))

print("\nMigración completa.")
print("⚠️  Todos los usuarios tienen contraseña temporal: Temporal123!")
print("    Envíales un link de reset de contraseña desde el dashboard de Supabase.")
