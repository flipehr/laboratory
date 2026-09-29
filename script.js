// ============================================================
// PRESIÓN MISTERIOSA — PV = nRT
// ============================================================

// ---------- Constantes físicas ----------
const R = 8314;              // kPa · mL / (mol · K)
const MIN_MED = 4;
const V_MAX   = 200;         // escala visual del pistón y gráfica

// ---------- Valores aleatorios por sesión ----------
let n, P_real;

function generarSesion() {
  n      = 0.002 + Math.random() * 0.003;   // 0.002 – 0.005 mol
  P_real = 120 + Math.random() * 80;        // 120 – 200 kPa
}

// V real a partir de T(°C) usando SIEMPRE Kelvin
function volumenReal(T_C) {
  return n * R * (T_C + 273.15) / P_real;
}

// ---------- Estado ----------
const mediciones = [];
let usarKelvin   = false;
let intentos     = 0;

// ---------- Referencias DOM ----------
const pantallaIntro     = document.getElementById('pantallaIntro');
const pantallaLab       = document.getElementById('pantallaLab');
const pantallaAnalisis  = document.getElementById('pantallaAnalisis');
const pantallaResultado = document.getElementById('pantallaResultado');

const nValor       = document.getElementById('nValor');
const sliderT      = document.getElementById('sliderT');
const tempLabel    = document.getElementById('tempLabel');
const volLabel     = document.getElementById('volLabel');
const btnRegistrar = document.getElementById('btnRegistrar');
const btnIrAnalisis= document.getElementById('btnIrAnalisis');
const contador     = document.getElementById('contador');
const tbodyDatos   = document.querySelector('#tablaDatos tbody');
const tbodyAnalisis= document.querySelector('#tablaAnalisis tbody');
const inputP       = document.getElementById('inputP');
const btnVerificar = document.getElementById('btnVerificar');
const feedback     = document.getElementById('feedback');
const infoGrafica  = document.getElementById('infoGrafica');
const ecuacionMini = document.getElementById('ecuacionMini');
const btnUnidad    = document.getElementById('btnUnidad');

const gas    = document.getElementById('gas');
const piston = document.getElementById('piston');
const rod    = document.getElementById('rod');
const peso   = document.getElementById('peso');
const pesoTx = document.getElementById('pesoTexto');

const cChica  = document.getElementById('graficaChica');
const ctxChica= cChica.getContext('2d');
const cGrande = document.getElementById('graficaGrande');
const ctxGrande = cGrande.getContext('2d');

// ---------- Utilidades ----------
function parseNum(str) {
  if (str === null || str === undefined) return NaN;
  return parseFloat(String(str).replace(',', '.'));
}

// Regresión lineal simple (mínimos cuadrados)
function regresionLineal(xs, ys) {
  const N = xs.length;
  if (N < 2) return { m: 0, b: 0, r2: 0 };
  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const den   = N * sumX2 - sumX * sumX;
  const m = den === 0 ? 0 : (N * sumXY - sumX * sumY) / den;
  const b = (sumY - m * sumX) / N;
  const yMean = sumY / N;
  const ssTot = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (m * xs[i] + b)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { m, b, r2 };
}

// ---------- Pistón ----------
function dibujarPiston(T_C) {
  const V = volumenReal(T_C);

  const H_MAX  = 218;      // altura máxima del gas
  const Y_BASE = 298;      // base del gas dentro del cilindro

  const h    = Math.min((V / V_MAX) * H_MAX, H_MAX);
  const yGas = Y_BASE - h;

  gas.setAttribute('y', yGas);
  gas.setAttribute('height', h);

  const yPiston = yGas - 16;
  piston.setAttribute('y', yPiston);

  // varilla y peso suben con el pistón
  const yRodTop = 30;
  rod.setAttribute('y', yRodTop);
  rod.setAttribute('height', Math.max(yPiston - yRodTop, 0));

  const yPesoTop = Math.max(yRodTop - 20, 5);
  peso.setAttribute('y', yPesoTop);
  pesoTx.setAttribute('y', yPesoTop + 16);

  // color del gas según temperatura
  const hue = 220 - (T_C / 150) * 220;
  gas.setAttribute('fill', `hsl(${hue}, 80%, 60%)`);

  tempLabel.textContent = T_C.toFixed(1);
  volLabel.textContent  = V.toFixed(1);
}

// ---------- Gráfica genérica ----------
function dibujarGrafica(ctx, canvas, opciones) {
  const { puntos, puntoActual, usarKelvin, mostrarEcuacion } = opciones;
  const W = canvas.width, H = canvas.height, PAD = 46;

  ctx.clearRect(0, 0, W, H);

  // Ejes
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, 12);
  ctx.lineTo(PAD, H - PAD);
  ctx.lineTo(W - 12, H - PAD);
  ctx.stroke();

  // Etiquetas
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.fillText(usarKelvin ? 'T (K)' : 'T (°C)', W / 2 - 15, H - 12);

  ctx.save();
  ctx.translate(14, H / 2 + 15);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('V (mL)', 0, 0);
  ctx.restore();

  // Rango X
  const xMin = usarKelvin ? 273 : 0;
  const xMax = usarKelvin ? 423 : 150;
  const yMin = 0, yMax = V_MAX;

  const mapX = x => PAD + (x - xMin) / (xMax - xMin) * (W - PAD - 15);
  const mapY = y => (H - PAD) - (y - yMin) / (yMax - yMin) * (H - PAD - 15);

  // Cuadrícula
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = mapY(i * yMax / 5);
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - 12, y); ctx.stroke();
    const x = mapX(xMin + i * (xMax - xMin) / 5);
    ctx.beginPath(); ctx.moveTo(x, 12); ctx.lineTo(x, H - PAD); ctx.stroke();
  }

  // Regresión y recta
  let eqText = '—';
  if (puntos.length >= 2) {
    const xs = puntos.map(p => usarKelvin ? p.T_C + 273.15 : p.T_C);
    const ys = puntos.map(p => p.V);
    const { m, b, r2 } = regresionLineal(xs, ys);

    // Línea
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mapX(xMin), mapY(m * xMin + b));
    ctx.lineTo(mapX(xMax), mapY(m * xMax + b));
    ctx.stroke();

    eqText = `V = ${m.toFixed(4)}·T ${b >= 0 ? '+' : '−'} ${Math.abs(b).toFixed(2)}   (R² = ${r2.toFixed(3)})`;
  }

  // Puntos
  puntos.forEach(p => {
    const x = usarKelvin ? p.T_C + 273.15 : p.T_C;
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(mapX(x), mapY(p.V), 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Punto actual
  if (puntoActual) {
    const x = usarKelvin ? puntoActual.T_C + 273.15 : puntoActual.T_C;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(mapX(x), mapY(puntoActual.V), 6, 0, Math.PI * 2);
    ctx.fill();
  }

  if (mostrarEcuacion) {
    return eqText;
  }
}

function actualizarGraficas() {
  const T_C_actual = parseFloat(sliderT.value);
  const puntoActual = { T_C: T_C_actual, V: volumenReal(T_C_actual) };

  const eq = dibujarGrafica(ctxChica, cChica, {
    puntos: mediciones,
    puntoActual,
    usarKelvin: false,
    mostrarEcuacion: true
  });
  ecuacionMini.textContent = eq || '—';

  if (!pantallaAnalisis.hidden) {
    const eq2 = dibujarGrafica(ctxGrande, cGrande, {
      puntos: mediciones,
      puntoActual: null,
      usarKelvin,
      mostrarEcuacion: true
    });
    infoGrafica.textContent = eq2 || '—';
  }
}

// ---------- Navegación ----------
function mostrarPantalla(p) {
  [pantallaIntro, pantallaLab, pantallaAnalisis, pantallaResultado]
    .forEach(s => s.hidden = true);
  p.hidden = false;
}

// ---------- Pantalla 1 ----------
document.getElementById('btnComenzar').addEventListener('click', () => {
  mostrarPantalla(pantallaLab);
  dibujarPiston(parseFloat(sliderT.value));
  actualizarGraficas();
});

// ---------- Pantalla 2 ----------
sliderT.addEventListener('input', () => {
  dibujarPiston(parseFloat(sliderT.value));
  actualizarGraficas();
});

btnRegistrar.addEventListener('click', () => {
  const T_C = parseFloat(sliderT.value);
  const V   = Math.round(volumenReal(T_C) * 10) / 10;

  if (mediciones.some(m => Math.abs(m.T_C - T_C) < 0.5)) {
    alert('Ya registraste una medición a esa temperatura. Elige otra.');
    return;
  }

  mediciones.push({ T_C, V });
  actualizarTablaDatos();
  actualizarGraficas();
});

function actualizarTablaDatos() {
  tbodyDatos.innerHTML = '';
  mediciones.forEach((m, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i + 1}</td><td>${m.T_C.toFixed(1)}</td><td>${m.V.toFixed(1)}</td>`;
    tbodyDatos.appendChild(tr);
  });
  contador.textContent = mediciones.length;
  btnIrAnalisis.disabled = mediciones.length < MIN_MED;
}

btnIrAnalisis.addEventListener('click', () => {
  construirTablaAnalisis();
  mostrarPantalla(pantallaAnalisis);
  actualizarGraficas();
});

// ---------- Pantalla 3 ----------
function construirTablaAnalisis() {
  tbodyAnalisis.innerHTML = '';
  mediciones.forEach((m, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${m.T_C.toFixed(1)}</td>
      <td>${m.V.toFixed(1)}</td>
      <td><input type="text" inputmode="decimal" data-fila="${i}" data-campo="Pi" placeholder="kPa"></td>
    `;
    tbodyAnalisis.appendChild(tr);
  });
}

btnVerificar.addEventListener('click', () => {
  const filas = mediciones.map((m, i) => {
    const inPi = tbodyAnalisis.querySelector(`input[data-fila="${i}"][data-campo="Pi"]`);
    return { ...m, Pi_user: parseNum(inPi.value), inPi };
  });

  const P_user = parseNum(inputP.value);

  // Validación de campos vacíos
  if (filas.some(f => isNaN(f.Pi_user)) || isNaN(P_user)) {
    feedback.hidden = false;
    feedback.className = 'feedback warn';
    feedback.innerHTML = '⚠️ Debes completar todos los campos antes de verificar.';
    return;
  }

  // Validar cada P_i
  let trampaKelvin = false;
  let inconsistentes = 0;

  filas.forEach(f => {
    const PiCorrecta = n * R * (f.T_C + 273.15) / f.V;
    const PiConCelsius = n * R * f.T_C / f.V;   // si usó °C por error
    f.inPi.classList.remove('input-error');

    const errRel = Math.abs(f.Pi_user - PiCorrecta) / PiCorrecta;
    if (errRel > 0.05) {
      f.inPi.classList.add('input-error');
      inconsistentes++;
      // ¿coincide con usar Celsius?
      if (Math.abs(f.Pi_user - PiConCelsius) / Math.max(PiConCelsius, 1) < 0.05) {
        trampaKelvin = true;
      }
    }
  });

  const errorPorc = Math.abs(P_user - P_real) / P_real * 100;
  intentos++;

  // Clasificación con insignia
  let insignia, titulo, color;
  if (errorPorc < 1)       { insignia='🏆'; titulo='Precisión perfecta'; color='ok'; }
  else if (errorPorc < 3)  { insignia='🥇'; titulo='Excelente';          color='ok'; }
  else if (errorPorc < 7)  { insignia='🥈'; titulo='Muy bien';           color='ok'; }
  else if (errorPorc < 15) { insignia='🥉'; titulo='Aceptable';          color='warn'; }
  else                     { insignia='❌'; titulo='Necesitas revisar';  color='bad'; }

  // Pistas progresivas
  let pista = '';
  if (errorPorc >= 15) {
    if (intentos === 1) {
      pista = `<p style="margin-top:12px;color:#fbbf24;">
        💡 <strong>Pista 1:</strong> revisa si tus valores de P<sub>i</sub> son
        consistentes entre sí. Si dan muy distintos, algo no cuadra.</p>`;
    } else if (intentos === 2) {
      pista = `<p style="margin-top:12px;color:#fbbf24;">
        💡 <strong>Pista 2:</strong> mira de nuevo la gráfica. Activa el botón
        del eje X y observa qué pasa con la recta.</p>`;
      btnUnidad.hidden = false; // aparece tras el 2do fallo
    } else {
      pista = `<p style="margin-top:12px;color:#fbbf24;">
        💡 <strong>Pista 3:</strong> ¿en qué unidades debe estar la temperatura
        para que el volumen sea directamente proporcional a ella?</p>`;
      btnUnidad.hidden = false;
    }
  }

  if (trampaKelvin && errorPorc >= 15) {
    pista = `<p style="margin-top:12px;color:#fbbf24;">
      💡 Tus P<sub>i</sub> coinciden con haber usado T en <em>°C</em> en lugar de K.
      Verifica cómo estás convirtiendo la temperatura.</p>`;
  } else if (inconsistentes === 0 && errorPorc >= 15) {
    pista = `<p style="margin-top:12px;color:#fbbf24;">
      💡 Tus P<sub>i</sub> individuales son correctas, pero el promedio final no.
      Revisa cómo calculaste el valor de la presión promedio.</p>`;
  }

  mostrarPantalla(pantallaResultado);
  document.getElementById('resultadoContenido').innerHTML = `
    <div class="resultado-card">
      <div class="insignia">${insignia}</div>
      <div class="titulo">${titulo}</div>
      <div class="fila">Tu presión: <strong>${P_user.toFixed(2)} kPa</strong></div>
      <div class="fila">Presión real: <strong>${P_real.toFixed(2)} kPa</strong></div>
      <div class="fila">Error relativo: <strong>${errorPorc.toFixed(2)} %</strong></div>
      ${pista}
      <button class="btn-grande" id="btnVolver" style="margin-top:20px;">← Volver a intentar</button>
    </div>`;

  document.getElementById('btnVolver').addEventListener('click', () => {
    mostrarPantalla(pantallaAnalisis);
  });
});

// ---------- Botón Kelvin ----------
btnUnidad.addEventListener('click', () => {
  usarKelvin = !usarKelvin;
  btnUnidad.textContent = usarKelvin ? 'Eje X: K' : 'Eje X: °C';
  actualizarGraficas();
});

// ---------- Reiniciar ----------
document.getElementById('btnReiniciar').addEventListener('click', () => location.reload());

// ---------- Arranque ----------
generarSesion();
nValor.textContent = n.toFixed(5);
