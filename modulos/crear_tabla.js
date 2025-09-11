import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { sanitizeIdentifier } from "./seguridad.js";

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

function addColumn() {
  const container = document.getElementById("columns");
  // Consultar enumerados en Supabase
  cargarEnumerados().then(enumTypes => {
    const div = document.createElement("div");
    div.className = "colDef";
    div.innerHTML = `
      <input type="text" placeholder="NOMBRE_COLUMNA" class="colName" />
      <select class="colType"></select>
      <label><input type="checkbox" class="notNull"> NOT NULL</label>
      <label><input type="checkbox" class="unique"> UNIQUE</label>
      <label><input type="radio" name="primaryKey" class="primary"> PRIMARY KEY</label>
      <button type="button" class="removeColBtn">❌</button>
    `;
    // Rellenar tipos
    const select = div.querySelector('.colType');
    [
      { value: "INT", label: "Entero" },
      { value: "DECIMAL", label: "Número con decimales" },
      { value: "VARCHAR(25)", label: "Texto corto (25)" },
      { value: "VARCHAR(50)", label: "Texto medio (50)" },
      { value: "VARCHAR(255)", label: "Texto grande (255)" },
      { value: "BOOLEAN", label: "Booleano" }
    ].forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      select.appendChild(o);
    });
    // Añadir enumerados
    enumTypes.forEach(enumName => {
      const o = document.createElement('option');
      o.value = enumName;
      o.textContent = `ENUM: ${enumName}`;
      select.appendChild(o);
    });
    container.appendChild(div);
    div.querySelector('.removeColBtn').onclick = function() { div.remove(); };
  });
}

// Consultar enumerados existentes en Supabase
async function cargarEnumerados() {
  const supabase = getSupabaseInstance();
  if (!supabase) return [];
  // Consulta los tipos ENUM
  const { data, error } = await supabase.rpc('get_enum_types');
  if (error || !data) return [];
  return data.map(row => row.enum_name);
}

async function createTable() {
  const supabase = getSupabaseInstance();
  if (!supabase) return;

  try {
  const rawTableName = document.getElementById("tableName").value.trim().toLowerCase().replace(/\s+/g, "_");
  const tableName = sanitizeIdentifier(rawTableName);
    if (!tableName) {
      alert("Introduce un nombre de tabla válido.");
      return;
    }

    const colDefs = [];
    let hasPrimary = false;

    const colElements = document.querySelectorAll(".colDef");
    for (const div of colElements) {
      let rawName = div.querySelector(".colName").value.trim().toLowerCase().replace(/\s+/g, "_");
      if (!rawName) continue;
      let name = sanitizeIdentifier(rawName);

      let type = div.querySelector(".colType").value; // Safe (from select)
      let notNull = div.querySelector(".notNull").checked ? " NOT NULL" : "";
      let unique = div.querySelector(".unique").checked ? " UNIQUE" : "";
      let primary = div.querySelector(".primary").checked;
      if (primary) {
        hasPrimary = true;
        primary = " PRIMARY KEY";
      } else {
        primary = "";
      }

      colDefs.push(`${name} ${type}${notNull}${unique}${primary}`);
    }

    if (colDefs.length === 0) {
      alert("Debes definir al menos una columna.");
      return;
    }

    if (!hasPrimary) {
      alert("Debes marcar una columna como PRIMARY KEY");
      return;
    }

    const sql = `CREATE TABLE ${tableName} (${colDefs.join(", ")});`;
    document.getElementById("preview").textContent = sql;

    const { error } = await supabase.rpc("exec_create_table", { query: sql });

    if (error) {
      alert("Error creando tabla: " + error.message);
    } else {
      await new Promise(res => setTimeout(res, 200)); // Espera 1 segundo
      // Segunda llamada: aplicar RLS
      const { error: rlsError } = await supabase.rpc("apply_rls", { table_name: tableName });
      if (rlsError) {
        alert("Tabla creada, pero error aplicando RLS: " + rlsError.message);
      } else {
        alert("Tabla creada con éxito ✅ y RLS aplicada");
      }
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Asignar listeners tras cargar el módulo
function setupCrearTablaListeners() {
  const addBtn = document.getElementById("addColumnBtn");
  if (addBtn) addBtn.onclick = addColumn;
  const createBtn = document.getElementById("createTableBtn");
  if (createBtn) createBtn.onclick = createTable;
}

// Ejecutar setup al cargar el módulo y refrescar enumerados
setupCrearTablaListeners();
