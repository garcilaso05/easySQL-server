// crear_llave.js
// Lógica para crear el archivo .easySQL comprimido y cifrado

import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";
import CryptoJS from "https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/+esm";

// Añadir usuario dinámicamente
function addUsuario() {
  const container = document.getElementById("usuariosContainer");
  const div = document.createElement("div");
  div.className = "usuarioDef";
  div.innerHTML = `
    <input type="text" placeholder="Usuario" class="usuarioNombre" required>
    <input type="password" placeholder="Contraseña" class="usuarioPass" required>
    <select class="usuarioRol">
      <option value="dev">dev</option>
      <option value="admin">admin</option>
    </select>
    <button type="button" onclick="this.parentElement.remove()">❌</button>
  `;
  container.appendChild(div);
}

document.getElementById("addUsuarioBtn").onclick = addUsuario;

// Validar fortaleza de la clave
function checkPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

document.getElementById("claveCifrado").addEventListener("input", e => {
  const pw = e.target.value;
  const strength = checkPasswordStrength(pw);
  const msg = ["Muy débil", "Débil", "Media", "Fuerte", "Muy fuerte", "Excelente"];
  const color = ["#c00", "#e67e22", "#f1c40f", "#27ae60", "#2ecc71", "#00b894"];
  const el = document.getElementById("passwordStrength");
  el.textContent = msg[strength];
  el.style.color = color[strength];
});

// Manejar el submit del formulario

document.getElementById("crearLlaveForm").onsubmit = async function(e) {
  e.preventDefault();
  const progreso = document.getElementById("progresoLlave");
  progreso.textContent = "Generando archivo...";

  // Recoger datos
  const nombreBD = document.getElementById("nombreBD").value.trim();
  const descripcionBD = document.getElementById("descripcionBD").value.trim();
  const supabaseUrl = document.getElementById("supabaseUrl").value.trim();
  const supabaseKey = document.getElementById("supabaseKey").value.trim();
  const apiGemini = document.getElementById("apiGemini").value.trim();
  const claveCifrado = document.getElementById("claveCifrado").value;

  // Validar clave fuerte
  if (checkPasswordStrength(claveCifrado) < 5) {
    progreso.textContent = "La clave de cifrado no es lo suficientemente fuerte.";
    return;
  }

  // Usuarios
  const usuarios = [];
  document.querySelectorAll(".usuarioDef").forEach(div => {
    const nombre = div.querySelector(".usuarioNombre").value.trim();
    const pass = div.querySelector(".usuarioPass").value;
    const rol = div.querySelector(".usuarioRol").value;
    if (nombre && pass && rol) {
      usuarios.push({ usuario: nombre, password: pass, rol });
    }
  });
  if (usuarios.length === 0) {
    progreso.textContent = "Debes añadir al menos un usuario.";
    return;
  }

  // Generar los .json
  const informacion = { nombre: nombreBD, descripcion: descripcionBD };
  const credenciales = { url: supabaseUrl, key: supabaseKey };
  const apiAI = { gemini: apiGemini };
  const usuariosRoles = usuarios;

  // Comprimir con JSZip
  const zip = new JSZip();
  zip.file("informacion.json", JSON.stringify(informacion, null, 2));
  zip.file("credenciales.json", JSON.stringify(credenciales, null, 2));
  zip.file("apiAI.json", JSON.stringify(apiAI, null, 2));
  zip.file("usuariosRoles.json", JSON.stringify(usuariosRoles, null, 2));

  const zipBlob = await zip.generateAsync({ type: "uint8array" });

  // Cifrar con CryptoJS AES
  const wordArray = CryptoJS.lib.WordArray.create(zipBlob);
  const encrypted = CryptoJS.AES.encrypt(wordArray, claveCifrado).toString();

  // Descargar
  const blob = new Blob([encrypted], { type: "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombreBD + ".easySQL";
  a.click();
  progreso.textContent = "Archivo generado y descargado con éxito.";
};
