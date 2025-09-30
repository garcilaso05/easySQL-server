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

let chartInstance = null;

// Cargar Chart.js si no está disponible
async function loadChartJS() {
  if (typeof Chart !== 'undefined') {
    return;
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Obtener todas las tablas disponibles
async function cargarTablas() {
  const supabase = getSupabaseInstance();
  if (!supabase) return;
  
  const select = document.getElementById("tableSelectGraph");
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

// Obtener campos de una tabla específica
async function cargarCamposTabla(tabla) {
  const supabase = getSupabaseInstance();
  if (!supabase) return;
  
  const select = document.getElementById("fieldSelectGraph");
  select.innerHTML = '<option value="">Selecciona un campo...</option>';
  select.disabled = !tabla;
  
  if (!tabla) return;
  
  try {
    sanitizeIdentifier(tabla);
    const { data, error } = await supabase.rpc('get_table_columns', { tabla });
    
    if (error || !data) {
      select.innerHTML = '<option value="">Error cargando campos</option>';
      return;
    }
    
    data.forEach(col => {
      const opt = document.createElement("option");
      opt.value = col.column_name;
      opt.textContent = `${col.column_name} (${col.data_type})`;
      select.appendChild(opt);
    });
    
  } catch (err) {
    console.error("Error:", err);
    select.innerHTML = '<option value="">Error: ' + err.message + '</option>';
  }
}

// Obtener datos para el gráfico
async function obtenerDatosGrafico(tabla, campo) {
  const supabase = getSupabaseInstance();
  if (!supabase) return null;
  
  try {
    // Validar identificadores
    sanitizeIdentifier(tabla);
    sanitizeIdentifier(campo);
    
    // Obtener datos agrupados y contados
    const { data, error } = await supabase
      .from(tabla)
      .select(campo);
      
    if (error) {
      console.error("Error obteniendo datos:", error);
      return null;
    }
    
    // Procesar datos para contar ocurrencias
    const conteos = {};
    let totalRegistros = 0;
    
    data.forEach(row => {
      const valor = row[campo];
      const valorStr = valor !== null && valor !== undefined ? String(valor) : 'NULL';
      conteos[valorStr] = (conteos[valorStr] || 0) + 1;
      totalRegistros++;
    });
    
    // Convertir a formato para Chart.js con porcentajes
    const labels = Object.keys(conteos);
    const valores = Object.values(conteos);
    const porcentajes = valores.map(v => ((v / totalRegistros) * 100).toFixed(2));
    
    return {
      labels,
      valores,
      porcentajes,
      totalRegistros
    };
    
  } catch (err) {
    console.error("Error:", err);
    return null;
  }
}

// Generar colores aleatorios para el gráfico
function generarColores(cantidad) {
  const colores = [];
  const coloresPredefinidos = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#C9CBCF', '#4BC0C0', '#FF6384', '#36A2EB'
  ];
  
  for (let i = 0; i < cantidad; i++) {
    if (i < coloresPredefinidos.length) {
      colores.push(coloresPredefinidos[i]);
    } else {
      // Generar color aleatorio
      const hue = (i * 137.508) % 360; // Distribución áurea
      colores.push(`hsl(${hue}, 70%, 60%)`);
    }
  }
  
  return colores;
}

// Crear gráfico según el tipo seleccionado
function crearGrafico(datos, tipoGrafico = 'pie') {
  const canvas = document.getElementById('chartCanvas');
  const ctx = canvas.getContext('2d');
  
  // Destruir gráfico anterior si existe
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  const colores = generarColores(datos.labels.length);
  
  // Configuración base del dataset
  let dataset = {
    data: datos.valores,
    backgroundColor: colores,
    borderColor: colores.map(color => color.replace('60%)', '40%)')),
    borderWidth: 2
  };
  
  // Configuraciones específicas según el tipo de gráfico
  let chartConfig = {
    type: tipoGrafico,
    data: {
      labels: datos.labels,
      datasets: [dataset]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Distribución de valores - ${tipoGrafico.charAt(0).toUpperCase() + tipoGrafico.slice(1)}`,
          font: {
            size: 16
          }
        },
        legend: {
          position: 'bottom'
        }
      }
    }
  };
  
  // Ajustar configuración según el tipo de gráfico
  switch (tipoGrafico) {
    case 'pie':
    case 'doughnut':
    case 'polarArea':
      chartConfig.options.plugins.legend.labels = {
        generateLabels: function(chart) {
          const original = Chart.defaults.plugins.legend.labels.generateLabels;
          const labels = original.call(this, chart);
          
          labels.forEach((label, index) => {
            label.text = `${label.text}: ${datos.porcentajes[index]}%`;
          });
          
          return labels;
        }
      };
      chartConfig.options.plugins.tooltip = {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const valor = context.parsed;
            const porcentaje = datos.porcentajes[context.dataIndex];
            return `${label}: ${valor} (${porcentaje}%)`;
          }
        }
      };
      break;
      
    case 'bar':
      chartConfig.type = 'bar';
      chartConfig.options.scales = {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cantidad'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Valores'
          }
        }
      };
      chartConfig.options.plugins.tooltip = {
        callbacks: {
          label: function(context) {
            const valor = context.parsed.y;
            const porcentaje = datos.porcentajes[context.dataIndex];
            return `Cantidad: ${valor} (${porcentaje}%)`;
          }
        }
      };
      break;
      
    case 'horizontalBar':
      chartConfig.type = 'bar';
      chartConfig.options.indexAxis = 'y';
      chartConfig.options.scales = {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cantidad'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Valores'
          }
        }
      };
      chartConfig.options.plugins.tooltip = {
        callbacks: {
          label: function(context) {
            const valor = context.parsed.x;
            const porcentaje = datos.porcentajes[context.dataIndex];
            return `Cantidad: ${valor} (${porcentaje}%)`;
          }
        }
      };
      break;
      
    case 'line':
      chartConfig.data.datasets[0].fill = false;
      chartConfig.data.datasets[0].tension = 0.1;
      chartConfig.options.scales = {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cantidad'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Valores'
          }
        }
      };
      chartConfig.options.plugins.tooltip = {
        callbacks: {
          label: function(context) {
            const valor = context.parsed.y;
            const porcentaje = datos.porcentajes[context.dataIndex];
            return `Cantidad: ${valor} (${porcentaje}%)`;
          }
        }
      };
      break;
      
    case 'scatter':
      // Para scatter, convertimos a coordenadas x,y
      chartConfig.data.datasets[0].data = datos.labels.map((label, index) => ({
        x: index,
        y: datos.valores[index]
      }));
      chartConfig.data.datasets[0].showLine = false;
      chartConfig.options.scales = {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cantidad'
          }
        },
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Índice del valor'
          },
          ticks: {
            callback: function(value) {
              return datos.labels[Math.round(value)] || '';
            }
          }
        }
      };
      chartConfig.options.plugins.tooltip = {
        callbacks: {
          label: function(context) {
            const index = Math.round(context.parsed.x);
            const valor = context.parsed.y;
            const label = datos.labels[index];
            const porcentaje = datos.porcentajes[index];
            return `${label}: ${valor} (${porcentaje}%)`;
          }
        }
      };
      break;
      
    case 'radar':
      chartConfig.data.datasets[0].fill = true;
      chartConfig.data.datasets[0].backgroundColor = colores[0] + '40';
      chartConfig.options.scales = {
        r: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cantidad'
          }
        }
      };
      chartConfig.options.plugins.tooltip = {
        callbacks: {
          label: function(context) {
            const valor = context.parsed.r;
            const porcentaje = datos.porcentajes[context.dataIndex];
            return `${context.label}: ${valor} (${porcentaje}%)`;
          }
        }
      };
      break;
  }
  
  chartInstance = new Chart(ctx, chartConfig);
}

// Mostrar estadísticas detalladas
function mostrarEstadisticas(datos, tabla, campo, tipoGrafico) {
  const container = document.getElementById('statsContainer');
  
  // Obtener nombre descriptivo del tipo de gráfico
  const tiposGrafico = {
    'pie': 'Circular (Pie)',
    'doughnut': 'Dona (Doughnut)', 
    'bar': 'Barras verticales',
    'horizontalBar': 'Barras horizontales',
    'line': 'Líneas',
    'scatter': 'Puntos (Scatter)',
    'polarArea': 'Área polar',
    'radar': 'Radar'
  };
  
  let html = `
    <h3>Estadísticas detalladas</h3>
    <p><strong>Tabla:</strong> ${tabla}</p>
    <p><strong>Campo:</strong> ${campo}</p>
    <p><strong>Tipo de gráfico:</strong> ${tiposGrafico[tipoGrafico] || tipoGrafico}</p>
    <p><strong>Total de registros:</strong> ${datos.totalRegistros}</p>
    <p><strong>Valores únicos:</strong> ${datos.labels.length}</p>
    
    <h4>Distribución:</h4>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th>Valor</th>
          <th>Cantidad</th>
          <th>Porcentaje</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // Ordenar por cantidad descendente
  const indices = Array.from(Array(datos.labels.length).keys());
  indices.sort((a, b) => datos.valores[b] - datos.valores[a]);
  
  indices.forEach(i => {
    html += `
      <tr>
        <td>${datos.labels[i]}</td>
        <td>${datos.valores[i]}</td>
        <td>${datos.porcentajes[i]}%</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  container.innerHTML = html;
}

// Event listeners
function setupGraficosListeners() {
  const tableSelect = document.getElementById('tableSelectGraph');
  const fieldSelect = document.getElementById('fieldSelectGraph');
  const chartTypeSelect = document.getElementById('chartTypeSelect');
  const generateBtn = document.getElementById('generateGraphBtn');
  const graphContainer = document.getElementById('graphContainer');
  const statsContainer = document.getElementById('statsContainer');
  
  if (!tableSelect || !fieldSelect || !chartTypeSelect || !generateBtn) {
    console.error('No se encontraron los elementos necesarios');
    return;
  }
  
  // Cambio de tabla
  tableSelect.onchange = async (e) => {
    const tabla = e.target.value;
    await cargarCamposTabla(tabla);
    generateBtn.disabled = true;
    graphContainer.innerHTML = '';
    statsContainer.innerHTML = '';
  };
  
  // Cambio de campo
  fieldSelect.onchange = (e) => {
    const campo = e.target.value;
    const tabla = tableSelect.value;
    generateBtn.disabled = !(tabla && campo);
  };
  
  // Generar gráfico
  generateBtn.onclick = async () => {
    const tabla = tableSelect.value;
    const campo = fieldSelect.value;
    const tipoGrafico = chartTypeSelect.value;
    
    if (!tabla || !campo) {
      alert('Selecciona una tabla y un campo');
      return;
    }
    
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generando...';
    
    try {
      // Cargar Chart.js si es necesario
      await loadChartJS();
      
      // Crear canvas si no existe
      if (!document.getElementById('chartCanvas')) {
        graphContainer.innerHTML = `
          <div style="width: 100%; height: 400px; position: relative;">
            <canvas id="chartCanvas"></canvas>
          </div>
        `;
      }
      
      // Obtener datos
      const datos = await obtenerDatosGrafico(tabla, campo);
      
      if (!datos) {
        graphContainer.innerHTML = '<p style="color: red;">Error obteniendo datos para el gráfico.</p>';
        return;
      }
      
      if (datos.labels.length === 0) {
        graphContainer.innerHTML = '<p>No hay datos para mostrar en esta tabla/campo.</p>';
        return;
      }
      
      // Crear gráfico y mostrar estadísticas
      crearGrafico(datos, tipoGrafico);
      mostrarEstadisticas(datos, tabla, campo, tipoGrafico);
      
    } catch (error) {
      console.error('Error generando gráfico:', error);
      graphContainer.innerHTML = '<p style="color: red;">Error generando el gráfico.</p>';
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generar Gráfico';
    }
  };
}

// Limpiar instancia global de supabase al cambiar de módulo
window.addEventListener('easySQL:moduleChange', () => {
  window._supabaseInstance = null;
  // Destruir gráfico si existe
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});

// Ejecutar setup y cargar tablas al cargar el módulo
setupGraficosListeners();
cargarTablas();