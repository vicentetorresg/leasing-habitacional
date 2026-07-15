// Script para crear usuarios del CRM Llave Propia
// Ejecutar: node scripts/create-users.mjs

const SUPABASE_URL = process.env.CRM_SUPABASE_URL || 'https://evuxdhvvarfxredghvpu.supabase.co';
const SERVICE_ROLE_KEY = process.env.CRM_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

function randomPassword(len = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pw = '';
  for (let i = 0; i < len; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

const users = [
  { email: 'vicente.torres@llavepropia.cl', full_name: 'Vicente Torres', role: 'admin' },
  { email: 'rodrigo.canas@llavepropia.cl',  full_name: 'Rodrigo Cañas',  role: 'admin' },
  { email: 'katherine@llavepropia.cl',      full_name: 'Katherine',       role: 'ejecutiva' },
];

async function createUser(email, full_name, role, password) {
  // 1. Create auth user
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Error creating ${email}: ${JSON.stringify(data)}`);
  const userId = data.id;
  console.log(`✓ Auth user created: ${email} (${userId})`);

  // 2. Insert profile
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ user_id: userId, full_name }),
  });
  if (!profileRes.ok) {
    const err = await profileRes.text();
    console.warn(`  Profile insert warning: ${err}`);
  }

  // 3. Insert user_role
  const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ user_id: userId, role }),
  });
  if (!roleRes.ok) {
    const err = await roleRes.text();
    console.warn(`  Role insert warning: ${err}`);
  }

  console.log(`  Profile + role (${role}) asignado`);
  return { email, full_name, role, password };
}

async function sendEmail(to, full_name, role, password) {
  const roleLabel = role === 'admin' ? 'Administrador' : 'Ejecutiva';
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
      <h2 style="color:#1e293b">Acceso al CRM Llave Propia</h2>
      <p>Hola <strong>${full_name}</strong>,</p>
      <p>Tu cuenta en el CRM de Llave Propia está lista. Estos son tus datos de acceso:</p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:4px 0"><strong>URL:</strong> <a href="https://www.llavepropia.cl/crm">https://www.llavepropia.cl/crm</a></p>
        <p style="margin:4px 0"><strong>Email:</strong> ${to}</p>
        <p style="margin:4px 0"><strong>Contraseña:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px">${password}</code></p>
        <p style="margin:4px 0"><strong>Rol:</strong> ${roleLabel}</p>
      </div>
      <p>Por seguridad, te recomendamos cambiar tu contraseña desde el menú de usuario.</p>
      <p style="color:#64748b;font-size:13px;margin-top:24px">— Llave Propia CRM</p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Llave Propia CRM <notificaciones@proppi.cl>',
      to: [to],
      subject: 'Tu acceso al CRM Llave Propia',
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`  Email warning for ${to}: ${err}`);
  } else {
    console.log(`  📧 Email enviado a ${to}`);
  }
}

async function main() {
  console.log('Creando usuarios CRM Llave Propia...\n');
  for (const u of users) {
    const password = randomPassword();
    try {
      await createUser(u.email, u.full_name, u.role, password);
      await sendEmail(u.email, u.full_name, u.role, password);
      console.log(`  🔑 Clave generada: ${password}\n`);
    } catch (err) {
      console.error(`✗ ${u.email}: ${err.message}\n`);
    }
  }
  console.log('Listo.');
}

main();
