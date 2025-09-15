import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { sanitizeIdentifier } from "./seguridad.js";

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

async function cargarTablasParaRelacion() {
  const supabase = getSupabaseInstance();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_public_tables');
  if (error || !data) return [];
  // Excluir 'profiles' y tablas que empiezan por 'relacion_'
  return data.map(row => row.table_name).filter(t => t !== 'profiles' && !t.startsWith('relacion_'));
}

async function cargarPKyTipo(tabla) {
  const supabase = getSupabaseInstance();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_primary_key', { tabla });
  if (error || !data || !data[0]) return null;
  const pk = data[0];
  let tipo = pk.data_type;
  if (pk.data_type && pk.data_type.toLowerCase().startsWith('character varying') && pk.character_maximum_length) {
    tipo = `VARCHAR(${pk.character_maximum_length})`;
  }
  return { name: pk.column_name, type: tipo };
}

async function crearRelacion() {
  const tabla1 = document.getElementById('relTable1').value;
  const tabla2 = document.getElementById('relTable2').value;
  if (!tabla1 || !tabla2 || tabla1 === tabla2) {
    mostrarMsg('Selecciona dos tablas diferentes.', 'red');
    return;
  }
  // Obtener PKs y tipos
  const pk1 = await cargarPKyTipo(tabla1);
  const pk2 = await cargarPKyTipo(tabla2);
  if (!pk1 || !pk2) {
    mostrarMsg('No se pudo determinar la PK de una de las tablas.', 'red');
    return;
  }
  // Sanitizar nombres
  const t1 = sanitizeIdentifier(tabla1);
  const t2 = sanitizeIdentifier(tabla2);
  const pkA = sanitizeIdentifier(pk1.name);
  const pkB = sanitizeIdentifier(pk2.name);
  const tipoA = pk1.type;
  const tipoB = pk2.type;
  // Ordenar nombres para evitar duplicados
  const [st1, st2, spkA, spkB, stipoA, stipoB] = t1 < t2 ? [t1, t2, pkA, pkB, tipoA, tipoB] : [t2, t1, pkB, pkA, tipoB, tipoA];
  const relTable = `relacion_${st1}_${st2}`;
  const col1 = `${st1}_${spkA}`;
  const col2 = `${st2}_${spkB}`;
  const sql = `CREATE TABLE ${relTable} (` +
    `${col1} ${stipoA}, ` +
    `${col2} ${stipoB}, ` +
    `PRIMARY KEY (${col1}, ${col2}), ` +
    `FOREIGN KEY (${col1}) REFERENCES ${st1}(${spkA}) ON DELETE CASCADE, ` +
    `FOREIGN KEY (${col2}) REFERENCES ${st2}(${spkB}) ON DELETE CASCADE` +
    `);`;
  console.log('SQL generado:', sql);
  document.getElementById('relacionMsg').textContent = sql;
  // Ejecutar SQL
  const supabase = getSupabaseInstance();
  const { error } = await supabase.rpc('exec_create_table', { query: sql });
  if (error) {
    mostrarMsg('Error creando relación: ' + error.message, 'red');
  } else {
    mostrarMsg('Relación creada con éxito ✅', 'green');
    await cargarTablasEnSelects();
  }
}

function mostrarMsg(msg, color) {
  const el = document.getElementById('relacionMsg');
  el.textContent = msg;
  el.style.color = color;
  setTimeout(() => { el.textContent = ''; }, 4000);
}

async function cargarTablasEnSelects() {
  const tablas = await cargarTablasParaRelacion();
  const sel1 = document.getElementById('relTable1');
  const sel2 = document.getElementById('relTable2');
  sel1.innerHTML = '<option value="">--</option>';
  sel2.innerHTML = '<option value="">--</option>';
  tablas.forEach(t => {
    const o1 = document.createElement('option');
    o1.value = t; o1.textContent = t; sel1.appendChild(o1);
    const o2 = document.createElement('option');
    o2.value = t; o2.textContent = t; sel2.appendChild(o2);
  });
}

document.getElementById('crearRelacionBtn').onclick = crearRelacion;
cargarTablasEnSelects();
