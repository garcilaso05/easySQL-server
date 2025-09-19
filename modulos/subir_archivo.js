// subir_archivo.js

// Versión simplificada sin dependencias externas para servidores web

// Implementación básica de JSZip para leer archivos
const JSZipSimple = {
  async loadAsync(data) {
    // Esta es una implementación muy básica - en producción necesitarías una librería completa
    console.warn('Usando implementación JSZip simplificada');
    return {
      file: (name) => ({
        async: (type) => {
          // Simulación - en real necesitas parsear el ZIP
          if (name === 'credenciales.json') return '{"url":"","key":""}';
          if (name === 'licencia.json') return '{"codigo":"test"}';
          return '{}';
        }
      })
    };
  }
};

// Implementación básica de CryptoJS
const CryptoJSSimple = {
  AES: {
    decrypt: (encrypted, key) => {
      console.warn('Usando implementación CryptoJS simplificada - NO SEGURA');
      // Esta es solo una simulación - NO uses esto en producción
      return {
        words: [0x7b227572, 0x6c223a22, 0x222c226b, 0x65792222, 0x3a22227d], // Simula JSON vacío
        toString: () => '{"url":"","key":""}'
      };
    }
  }
};

// Configuración simplificada de Firebase (solo para validación)
const firebaseSimple = {
  async validateLicense(codigo) {
    console.warn('Validación de licencia deshabilitada en servidor web');
    return { exists: true, active: true }; // Simula licencia válida
  },
  async logAccess(codigo, email) {
    console.warn('Log de acceso deshabilitado en servidor web');
  }
};

let credenciales = null;
let supabase = null;
let licenciaCodigo = null;

// Funciones globales para otros módulos
window.getSupabaseCreds = () => credenciales || { url: '', key: '' };

// Paso 1: Leer archivo y mostrar formulario manual
document.getElementById("formArchivo").onsubmit = async function(e) {
  e.preventDefault();
  const progreso = document.getElementById("progresoArchivo");
  const fileInput = document.getElementById("archivoEasySQL");
  
  if (!fileInput.files.length) {
    progreso.textContent = "Selecciona un archivo .easySQL";
    return;
  }

  // Para servidores web, mostrar formulario manual
  progreso.textContent = "Archivo detectado. Introduce manualmente las credenciales:";
  document.getElementById("subirArchivoBox").style.display = "none";
  document.getElementById("manualCredsBox").style.display = "block";
};

// Crear formulario manual para credenciales
const manualCredsHTML = `
<div id="manualCredsBox" style="display:none">
  <h3>Introduce las credenciales manualmente</h3>
  <p style="color: orange;">⚠️ En servidor web no se puede desencriptar automáticamente. Introduce los datos de tu archivo .easySQL:</p>
  <form id="formManualCreds">
    <label>Supabase URL:<br>
      <input type="url" id="manualUrl" required placeholder="https://tu-proyecto.supabase.co">
    </label><br><br>
    <label>Supabase API Key (anon):<br>
      <input type="text" id="manualKey" required placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">
    </label><br><br>
    <button type="submit">Continuar al login</button>
  </form>
  <div id="progresoManual"></div>
</div>`;

// Insertar el HTML del formulario manual
document.getElementById("loginBox").insertAdjacentHTML('beforebegin', manualCredsHTML);

// Manejar credenciales manuales
document.getElementById("formManualCreds").onsubmit = async function(e) {
  e.preventDefault();
  const progreso = document.getElementById("progresoManual");
  
  credenciales = {
    url: document.getElementById("manualUrl").value.trim(),
    key: document.getElementById("manualKey").value.trim()
  };

  if (!credenciales.url || !credenciales.key) {
    progreso.textContent = "Completa todos los campos";
    return;
  }

  // Validar formato básico
  if (!credenciales.url.includes('supabase.co')) {
    progreso.textContent = "URL de Supabase inválida";
    return;
  }

  progreso.textContent = "Credenciales guardadas. Procede al login...";
  document.getElementById("manualCredsBox").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
};

// Paso 2: Login usuario Supabase (usando fetch directo)
document.getElementById("formLogin").onsubmit = async function(e) {
  e.preventDefault();
  const progreso = document.getElementById("progresoLogin");
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value;

  if (!credenciales || !credenciales.url || !credenciales.key) {
    progreso.textContent = "Error: credenciales no configuradas";
    return;
  }

  progreso.textContent = "Autenticando...";

  try {
    // Login directo con Supabase REST API
    const response = await fetch(`${credenciales.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': credenciales.key
      },
      body: JSON.stringify({
        email: email,
        password: pass
      })
    });

    if (!response.ok) {
      const error = await response.text();
      progreso.textContent = "Usuario o contraseña incorrectos";
      console.error('Auth error:', error);
      return;
    }

    const authData = await response.json();
    
    // Crear un objeto supabase simplificado
    supabase = {
      auth: {
        session: authData,
        user: authData.user
      },
      rpc: async (funcName, params = {}) => {
        const rpcResponse = await fetch(`${credenciales.url}/rest/v1/rpc/${funcName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': credenciales.key,
            'Authorization': `Bearer ${authData.access_token}`
          },
          body: JSON.stringify(params)
        });
        
        if (!rpcResponse.ok) {
          return { data: null, error: { message: `RPC ${funcName} failed` } };
        }
        
        const data = await rpcResponse.json();
        return { data, error: null };
      },
      from: (table) => ({
        select: (columns = '*') => ({
          eq: (column, value) => ({
            order: (orderColumn, opts = {}) => fetch(`${credenciales.url}/rest/v1/${table}?select=${columns}&${column}=eq.${value}&order=${orderColumn}.${opts.ascending ? 'asc' : 'desc'}`, {
              headers: {
                'apikey': credenciales.key,
                'Authorization': `Bearer ${authData.access_token}`
              }
            }).then(r => r.ok ? r.json().then(data => ({data, error: null})) : ({data: null, error: {message: 'Query failed'}}))
          }),
          then: (resolve) => fetch(`${credenciales.url}/rest/v1/${table}?select=${columns}`, {
            headers: {
              'apikey': credenciales.key,
              'Authorization': `Bearer ${authData.access_token}`
            }
          }).then(r => r.ok ? r.json().then(data => resolve({data, error: null})) : resolve({data: null, error: {message: 'Query failed'}}))
        }),
        insert: (rows) => fetch(`${credenciales.url}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': credenciales.key,
            'Authorization': `Bearer ${authData.access_token}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(rows)
        }).then(r => ({ data: r.ok ? [] : null, error: r.ok ? null : { message: 'Insert failed', code: r.status === 403 ? '42501' : 'unknown' } }))
      })
    };

    // Guardar instancia global
    window._supabaseInstance = supabase;

    progreso.textContent = "Login exitoso ✅";
    mostrarMenuApp();
    
  } catch (err) {
    progreso.textContent = "Error de conexión: " + err.message;
    console.error('Login error:', err);
  }
};

// Mostrar todos los menús tras login
function mostrarMenuApp() {
  document.querySelector("header nav").innerHTML = '';
  const nav = document.querySelector("header nav");
  nav.innerHTML += '<button onclick="loadModule(\'modulos/crear_tabla.html\',\'modulos/crear_tabla.js\')">Crear Tablas</button>';
  nav.innerHTML += '<button onclick="loadModule(\'modulos/crear_enumerado.html\',\'modulos/crear_enumerado.js\')">Crear enumerado</button>';
  nav.innerHTML += '<button onclick="loadModule(\'modulos/inserciones.html\',\'modulos/inserciones.js\')">Inserciones</button>';
  nav.innerHTML += '<button onclick="loadModule(\'modulos/editar_tabla.html\',\'modulos/editar_tabla.js\')">Editar tabla</button>';
  nav.innerHTML += '<button onclick="loadModule(\'modulos/gestionar_relaciones.html\',\'modulos/gestionar_relaciones.js\')">Gestionar relaciones</button>';
  window.loadModule('modulos/crear_tabla.html','modulos/crear_tabla.js');
  document.getElementById("loginBox").style.display = "none";
}
