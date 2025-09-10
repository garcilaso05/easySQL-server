import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Usar una sola instancia global de supabase
function getSupabaseInstance() {
  if (!window._supabaseInstance) {
    const { url, key } = window.getSupabaseCreds();
    if (!url || !key) {
      alert("Introduce credenciales de Supabase");
      return null;
    }
    window._supabaseInstance = createClient(url, key);
  }
  return window._supabaseInstance;
}

function addEnumElement() {
  const container = document.getElementById("enumElements");
  const div = document.createElement("div");
  div.className = "enumElementDef";
  div.innerHTML = `
    <input type="text" placeholder="Valor" class="enumElement" required>
    <button type="button" onclick="this.parentElement.remove()">❌</button>
  `;
  container.appendChild(div);
}

document.getElementById("addEnumElementBtn").onclick = addEnumElement;

document.getElementById("formCrearEnum").onsubmit = async function(e) {
  e.preventDefault();
  const supabase = getSupabaseInstance();
  if (!supabase) return;
  const status = document.getElementById("enumStatus");
  status.textContent = "Creando enumerado...";
  const name = document.getElementById("enumName").value.trim();
  const elements = Array.from(document.querySelectorAll('.enumElement'))
    .map(el => el.value.trim())
    .filter(v => v);
  if (!name || elements.length === 0) {
    status.textContent = "Debes indicar un nombre y al menos un elemento.";
    return;
  }
  // Generar SQL ENUM
  const sql = `CREATE TYPE ${name} AS ENUM (${elements.map(e => `'${e.replace(/'/g, "''")}'`).join(', ')});`;
  // Ejecutar en Supabase (requiere función RPC exec_create_enum)
  const { error } = await supabase.rpc("exec_create_enum", { query: sql });
  if (error) {
    status.textContent = "Error creando enumerado: " + error.message;
  } else {
    status.textContent = "Enumerado creado con éxito ✅";
  }
};
