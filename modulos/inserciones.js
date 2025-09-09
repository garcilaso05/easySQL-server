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

// Obtener tablas al cargar el módulo usando la función RPC
async function cargarTablas() {
  if (!initSupabase()) return;
  const select = document.getElementById("insertTableSelect");
  select.innerHTML = '<option value="">Selecciona una tabla...</option>';
  const { data, error } = await supabase.rpc('get_public_tables');
  if (error || !data) {
    alert("Error obteniendo tablas: " + (error?.message || ''));
    return;
  }
  data.forEach(row => {
    const opt = document.createElement("option");
    opt.value = row.table_name;
    opt.textContent = row.table_name;
    select.appendChild(opt);
  });
}

// Obtener columnas y tipos de la tabla seleccionada usando la función RPC
async function cargarCamposTabla(tabla) {
  if (!initSupabase()) return;
  const container = document.getElementById("insertFormContainer");
  container.innerHTML = '';
  if (!tabla) return;
  const { data, error } = await supabase.rpc('get_table_columns', { tabla });
  if (error || !data) {
    container.innerHTML = '<span style="color:red">Error obteniendo columnas</span>';
    return;
  }
  data.forEach(col => {
    let input;
    let label = document.createElement('label');
    label.textContent = col.column_name + ': ';
    if (col.data_type === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'fieldValue';
      input.name = col.column_name;
    } else if (col.data_type === 'integer' || col.data_type === 'bigint' || col.data_type === 'smallint') {
      input = document.createElement('input');
      input.type = 'number';
      input.className = 'fieldValue';
      input.name = col.column_name;
    } else if (col.data_type && col.data_type.startsWith('character')) {
      input = document.createElement('input');
      input.type = 'text';
      input.maxLength = col.character_maximum_length || '';
      input.className = 'fieldValue';
      input.name = col.column_name;
    } else if (col.data_type === 'text' || col.data_type === 'varchar' || col.data_type === 'character varying') {
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'fieldValue';
      input.name = col.column_name;
    } else if (col.data_type === 'numeric' || col.data_type === 'decimal' || col.data_type === 'real' || col.data_type === 'double precision') {
      input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.className = 'fieldValue';
      input.name = col.column_name;
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'fieldValue';
      input.name = col.column_name;
    }
    label.appendChild(input);
    container.appendChild(label);
    container.appendChild(document.createElement('br'));
  });
}

// Insertar fila usando los campos generados
async function insertRow() {
  if (!initSupabase()) return;
  const select = document.getElementById("insertTableSelect");
  const tableName = select.value;
  if (!tableName) {
    alert("Selecciona una tabla");
    return;
  }
  const container = document.getElementById("insertFormContainer");
  const inputs = container.querySelectorAll('.fieldValue');
  const row = {};
  inputs.forEach(input => {
    let value;
    if (input.type === 'checkbox') {
      value = input.checked;
    } else if (input.type === 'number') {
      value = input.value === '' ? null : Number(input.value);
    } else {
      value = input.value;
    }
    row[input.name] = value;
  });
  // Generar SQL de referencia
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

// Asignar listeners tras cargar el módulo
function setupInsercionesListeners() {
  const select = document.getElementById("insertTableSelect");
  if (select) {
    select.onchange = () => cargarCamposTabla(select.value);
  }
  const insertBtn = document.getElementById("insertRowBtn");
  if (insertBtn) insertBtn.onclick = insertRow;
}

// Ejecutar setup y cargar tablas al cargar el módulo
setupInsercionesListeners();
cargarTablas();
