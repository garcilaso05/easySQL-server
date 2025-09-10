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

  const tableName = document.getElementById("tableName").value.trim();
  if (!tableName) {
    alert("Introduce un nombre de tabla");
    return;
  }

  const colDefs = [];
  let hasPrimary = false;

  document.querySelectorAll(".colDef").forEach(div => {
    let name = div.querySelector(".colName").value.trim().toUpperCase();
    if (!name) return;
    name = name.replace(/\s+/g, "_");

    let type = div.querySelector(".colType").value;
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
  });

  if (!hasPrimary) {
    alert("Debes marcar una columna como PRIMARY KEY");
    return;
  }

  const sql = `CREATE TABLE ${tableName.toUpperCase()} (${colDefs.join(", ")});`;
  document.getElementById("preview").textContent = sql;

  const { error } = await supabase.rpc("exec_create_table", { query: sql });

  if (error) {
    alert("Error creando tabla: " + error.message);
  } else {
    alert("Tabla creada con éxito ✅");
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
