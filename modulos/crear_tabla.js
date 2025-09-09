import { createClient } from "https://esm.sh/@supabase/supabase-js";

let supabase = null;

function initSupabase() {
  const { url, key } = window.getSupabaseCreds();
  if (!url || !key) {
    alert("Introduce credenciales de Supabase");
    return null;
  }
  supabase = createClient(url, key);
  return supabase;
}

function addColumn() {
  const container = document.getElementById("columns");

  const div = document.createElement("div");
  div.className = "colDef";

  div.innerHTML = `
    <input type="text" placeholder="NOMBRE_COLUMNA" class="colName" />
    <select class="colType">
      <option value="INT">Entero</option>
      <option value="DECIMAL">Número con decimales</option>
      <option value="VARCHAR(25)">Texto corto (25)</option>
      <option value="VARCHAR(50)">Texto medio (50)</option>
      <option value="VARCHAR(255)">Texto grande (255)</option>
      <option value="BOOLEAN">Booleano</option>
    </select>
    <label><input type="checkbox" class="notNull"> NOT NULL</label>
    <label><input type="checkbox" class="unique"> UNIQUE</label>
    <label><input type="radio" name="primaryKey" class="primary"> PRIMARY KEY</label>
    <button onclick="this.parentElement.remove()">❌</button>
  `;

  container.appendChild(div);
}

async function createTable() {
  if (!initSupabase()) return;

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

document.getElementById("addColumnBtn").onclick = addColumn;
document.getElementById("createTableBtn").onclick = createTable;
