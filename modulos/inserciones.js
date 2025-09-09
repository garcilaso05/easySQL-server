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

function addField() {
  const container = document.getElementById("insertFields");

  const div = document.createElement("div");
  div.className = "fieldDef";

  div.innerHTML = `
    <input type="text" placeholder="COLUMNA" class="fieldName" />
    <input type="text" placeholder="VALOR" class="fieldValue" />
    <button onclick="this.parentElement.remove()">❌</button>
  `;

  container.appendChild(div);
}

async function insertRow() {
  if (!initSupabase()) return;

  const tableName = document.getElementById("insertTable").value.trim();
  if (!tableName) {
    alert("Introduce un nombre de tabla");
    return;
  }

  const row = {};
  document.querySelectorAll(".fieldDef").forEach(div => {
    const name = div.querySelector(".fieldName").value.trim();
    let value = div.querySelector(".fieldValue").value.trim();
    if (name) {
      // Detectar si es número o booleano, si no queda como string
      if (/^\d+$/.test(value)) value = parseInt(value, 10);
      else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);
      else if (value.toLowerCase() === "true") value = true;
      else if (value.toLowerCase() === "false") value = false;

      row[name] = value;
    }
  });

  if (Object.keys(row).length === 0) {
    alert("Introduce al menos un campo con valor");
    return;
  }

  // Generar SQL de referencia (opcional)
  const columns = Object.keys(row).map(k => k.toUpperCase());
  const values = Object.values(row).map(v =>
    typeof v === "string" ? `'${v}'` : v
  );
  const sql = `INSERT INTO ${tableName.toUpperCase()} (${columns.join(", ")}) VALUES (${values.join(", ")});`;
  document.getElementById("insertPreview").textContent = sql;

  // Ejecutar inserción en Supabase
  const { error } = await supabase.from(tableName).insert([row]);

  if (error) {
    alert("Error insertando fila: " + error.message);
  } else {
    alert("Fila insertada con éxito ✅");
  }
}

document.getElementById("addFieldBtn").onclick = addField;
document.getElementById("insertRowBtn").onclick = insertRow;
