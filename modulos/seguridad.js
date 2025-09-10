// modulos/seguridad.js

/**
 * Sanitiza un identificador de SQL (como nombre de tabla o columna) para prevenir inyección de SQL.
 * Solo permite caracteres alfanuméricos y guiones bajos. No puede empezar con número.
 * @param {string} identifier El identificador a sanitizar.
 * @returns {string} El identificador sanitizado.
 * @throws {Error} Si el identificador no es válido.
 */
export function sanitizeIdentifier(identifier) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Nombre inválido: "${identifier}". Solo se permiten caracteres alfanuméricos y guiones bajos, y no debe comenzar con un número.`);
  }
  return identifier;
}

/**
 * Escapa un valor de texto para ser usado dentro de una cadena SQL.
 * Reemplaza comillas simples por dobles comillas simples.
 * @param {string} value El valor a escapar.
 * @returns {string} El valor escapado.
 */
export function escapeSqlValue(value) {
  if (value === null || typeof value === 'undefined') {
    return 'NULL';
  }
  return `'${value.replace(/'/g, "''")}'`;
}
