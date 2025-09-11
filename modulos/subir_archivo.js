// subir_archivo.js
import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";
import CryptoJS from "https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/+esm";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

let credenciales = null;
let supabase = null;

// Paso 1: Leer archivo y desencriptar

document.getElementById("formArchivo").onsubmit = async function(e) {
  e.preventDefault();
  const progreso = document.getElementById("progresoArchivo");
  progreso.textContent = "Procesando archivo...";
  const fileInput = document.getElementById("archivoEasySQL");
  const clave = document.getElementById("claveDesencriptar").value;
  if (!fileInput.files.length) {
    progreso.textContent = "Selecciona un archivo .easySQL";
    return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = async function(ev) {
    try {
      // Desencriptar
      const encrypted = ev.target.result;
      const decrypted = CryptoJS.AES.decrypt(encrypted, clave);
      const uint8arr = new Uint8Array(decrypted.words.length * 4);
      for (let i = 0; i < decrypted.words.length; ++i) {
        const word = decrypted.words[i];
        uint8arr[i * 4 + 0] = (word >> 24) & 0xff;
        uint8arr[i * 4 + 1] = (word >> 16) & 0xff;
        uint8arr[i * 4 + 2] = (word >> 8) & 0xff;
        uint8arr[i * 4 + 3] = word & 0xff;
      }
      // Descomprimir
      const zip = await JSZip.loadAsync(uint8arr);
      credenciales = JSON.parse(await zip.file("credenciales.json").async("string"));
      // Mostrar login
      document.getElementById("subirArchivoBox").style.display = "none";
      document.getElementById("loginBox").style.display = "block";
      progreso.textContent = "";
    } catch (err) {
      progreso.textContent = "Error al desencriptar o descomprimir el archivo. ¿Clave correcta?";
    }
  };
  reader.readAsText(file);
};

// Paso 2: Login usuario Supabase

document.getElementById("formLogin").onsubmit = async function(e) {
  e.preventDefault();
  const progreso = document.getElementById("progresoLogin");
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value;
  // Crear instancia de Supabase con las credenciales desencriptadas
  supabase = createClient(credenciales.url, credenciales.key);
  // Login con email y password
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) {
    progreso.textContent = "Usuario o contraseña incorrectos.";
    return;
  }
  // Guardar instancia global para el resto de módulos
  window._supabaseInstance = supabase;
  // Mostrar todos los menús (sin roles)
  mostrarMenuApp();
};

// Mostrar todos los menús tras login
function mostrarMenuApp() {
  document.querySelector("header nav").innerHTML = '';
  const nav = document.querySelector("header nav");
  nav.innerHTML += '<button onclick="loadModule(\'modulos/crear_tabla.html\',\'modulos/crear_tabla.js\')">Crear Tablas</button>';
  nav.innerHTML += '<button onclick="loadModule(\'modulos/crear_enumerado.html\',\'modulos/crear_enumerado.js\')">Crear enumerado</button>';
  nav.innerHTML += '<button onclick="loadModule(\'modulos/inserciones.html\',\'modulos/inserciones.js\')">Inserciones</button>';
  window.loadModule('modulos/crear_tabla.html','modulos/crear_tabla.js');
  document.getElementById("loginBox").style.display = "none";
}
