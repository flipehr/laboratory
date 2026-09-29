// ============================================================
// PRESIÓN MISTERIOSA — PV = nRT
// Dos rutas válidas: A (fila por fila) y B (pendiente gráfica)
// ============================================================

const R = 8314;              // kPa · mL / (mol · K)
const MIN_MED = 4;
const V_MAX   = 200;

// ---------- Sesión aleatoria ----------
let n, P_real;

function generarSesion() {
  n      = 0.002 + Math.random() * 0.003;   // 0.002 – 0.005 mol
  P_real = 120 + Math.random() * 80;        // 120 – 200 kPa
}

function volumenReal(T_C) {
  return n * R * (T_C + 273.15) / P_real;
}

// ---------- Estado ----------
const mediciones = [];
let usarKelvin   = false;
let intentos     = 0;
let ultimaRegresion = null;   // { m, b, r2 }

// ---------- DOM ----------
const pantallaIntro     = document.getElementById('pantallaIntro');
const pantallaLab       = document.getElementById('pantallaLab');
const pantallaAnalisis  = document.getElementById('pantallaAnalisis');
const pantallaResultado = document.getElementById('pantallaResultado');

const nValor       = document.getElementById('nValor');
const nLab         = document.getElementById('nLab');
const nAnalisis    = document.getElementById('nAnalisis');
const sliderT      = document.getElementById('sliderT');
const tempLabel    = document.getElementById('tempLabel');
const volLabel     = document.getElementById('volLabel');
const btnRegistrar = document.getElementById('btnRegistrar');
const btnIrAnalisis= document.getElementById('btnIrAnalisis');
const contador     = document.getElementById('contador');
const tbodyDatos   = document.querySelector('#tablaDatos tbody');
const tbodyAnalisis= document.querySelector('#tablaAnalisis tbody');
const inputP       = document.getElementById('inputP');
const inputPGrafica= document.getElementById('inputPGrafica');
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

const cChica   = document.getElementById('graficaChica');
const ctxChica = cChica.getContext('2d');
const cGrande  = document.getElementById('graficaGrande');
const ctxGrande= cGrande.getContext('2d');

// ---------- Utilidades ----------
function parseNum(str) {
  if (str === null || str === undefined) return NaN;
  return parseFloat(String(str).replace(',', '.'));
}

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

  const H_MAX  = 218;
  const Y_BASE = 298;

  const h    = Math.min((V / V_MAX) * H_MAX, H_MAX);
  const yGas = Y_BASE - h;

  gas.setAttribute('y', yGas);
  gas.setAttribute('height', h);

  const yPiston = yGas - 16;
  piston.setAttribute('y', yPiston);

  const yRodTop = 30;
  rod.setAttribute('y', yRodTop);
  rod.setAttribute('height', Math.max(yPiston - yRodTop, 0));

  const yPesoTop = Math.max(yRodTop - 20, 5);
  peso.setAttribute('y', yPesoTop);
  pesoTx.setAttribute('y', yPesoTop + 16);

  const hue = 220 - (T_C / 150) * 220;
  gas.setAttribute('fill', `hsl(${hue}, 80%, 60%)`);

  tempLabel.textContent = T_C.toFixed(1);
  volLabel.textContent  = V.toFixed(1);
}

// ---------- Gráfica ----------
function dibujarGrafica(ctx, canvas, opciones) {
  const { puntos, puntoActual, usarKelvin } = opciones;
  const W = canvas.width, H = canvas.height, PAD = 50;

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
  ctx.font = '13px sans-serif';
  ctx.fillText(usarKelvin ? 'T (K)' : 'T (°C)', W / 2 - 15, H - 14);

  ctx.save();
  ctx.translate(16, H / 2 + 15);
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

  // Marca el origen (0,0) para que se vea si la recta pasa por ahí
  if (yMin <= 0 && xMin <= 0) {
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(mapX(0), mapY(0), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('(0,0)', mapX(0) + 6, mapY(0) + 14);
  }

  // Regresión y recta
  let resultado = null;
  if (puntos.length >= 2) {
    const xs = puntos.map(p => usarKelvin ? p.T_C + 273.15 : p.T_C);
    const ys = puntos.map(p => p.V);
    const reg = regresionLineal(xs, ys);
    resultado = reg;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mapX(xMin), mapY(reg.m * xMin + reg.b));
    ctx.lineTo(mapX(xMax), mapY(reg.m * xMax + reg.b));
    ctx.stroke();
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

  return resultado;
}

function formatearEcuacion(reg) {
  if (!reg) return '—';
  const signo = reg.b >= 0 ? '+' : '−';
  return `V = ${reg.m.toFixed(4)}·T ${signo} ${Math.abs(reg.b).toFixed(2)}   (R² = ${reg.r2.toFixed(3)})`;
}

function actualizarGraficas() {
  const T_C_actual = parseFloat(sliderT.value);
  const puntoActual = { T_C: T_C_actual, V: volumenReal(T_C_actual) };

  // Chica (siempre en °C)
  const regChica = dibujarGrafica(ctxChica, cChica, {
    puntos: mediciones,
    puntoActual,
    usarKelvin: false
  });
  ecuacionMini.textContent = formatearEcuacion(regChica);

  // Grande (solo si estamos en análisis)
  if (!pantallaAnalisis.hidden) {
    const regGrande = dibujarGrafica(ctxGrande, cGrande, {
      puntos: mediciones,
      puntoActual: null,
      usarKelvin
    });
    ultimaRegresion = regGrande;

    if (regGrande) {
      let texto = formatearEcuacion(regGrande);
      // Aviso sutil cuando la recta NO pasa por el origen en modo °C
      if (!usarKelvin && Math.abs(regGrande.b) > 5) {
        texto += `<br><span style="color:#94a3b8;">(la recta no pasa por el origen)</span>`;
      }
      if (usarKelvin && Math.abs(regGrande.b) < 5) {
        texto += `<br><span style="color:#10b981;">(ahora la recta pasa cerca del origen ✓)</span>`;
      }
      infoGrafica.innerHTML = texto;
    } else {
      infoGrafica.textContent = '—';
    }
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
  // Leer datos
  const filas = mediciones.map((m, i) => {
    const inPi = tbodyAnalisis.querySelector(`input[data-fila="${i}"][data-campo="Pi"]`);
    return { ...m, Pi_user: parseNum(inPi.value), inPi, vacio: inPi.value.trim() === '' };
  });

  const P_A_user = parseNum(inputP.value);
  const P_B_user = parseNum(inputPGrafica.value);
  const rutaA_llena = !isNaN(P_A_user);
  const rutaB_llena = !isNaN(P_B_user);

  // ¿Llenó al menos una ruta?
  const algunaFilaConPi = filas.some(f => !isNaN(f.Pi_user));
  if (!rutaA_llena && !rutaB_llena && !algunaFilaConPi) {
    feedback.hidden = false;
    feedback.className = 'feedback warn';
    feedback.innerHTML = '⚠️ Debes completar al menos <strong>una de las dos rutas</strong> antes de verificar.';
    return;
  }

  // --- Validar Ruta A (si el usuario la usó) ---
  let rutaA_ok = false;
  let errA = null;
  let trampaKelvin = false;
  let inconsistentes = 0;

  if (rutaA_llena) {
    // Validar cada Pi escrita
    filas.forEach(f => {
      f.inPi.classList.remove('input-error');
      if (f.vacio) return;
      const PiCorrecta   = n * R * (f.T_C + 273.15) / f.V;
      const PiConCelsius = n * R * f.T_C / f.V;
      const errRel = Math.abs(f.Pi_user - PiCorrecta) / PiCorrecta;
      if (errRel > 0.05) {
        f.inPi.classList.add('input-error');
        inconsistentes++;
        if (Math.abs(f.Pi_user - PiConCelsius) / Math.max(PiConCelsius, 1) < 0.05) {
          trampaKelvin = true;
        }
      }
    });

    errA = Math.abs(P_A_user - P_real) / P_real * 100;
    rutaA_ok = errA < 5;
  }

  // --- Validar Ruta B (si el usuario la usó) ---
  let rutaB_ok = false;
  let errB = null;
  if (rutaB_llena && ultimaRegresion && ultimaRegresion.m > 0) {
    errB = Math.abs(P_B_user - P_real) / P_real * 100;
    rutaB_ok = errB < 5;
  }

  // --- Decisión general ---
  // Elegimos el "mejor" error de las rutas usadas
  let errorFinal = null;
  let rutaUsada = '';
  if (rutaA_llena && rutaB_llena) {
    errorFinal = Math.min(errA, errB);
    rutaUsada = errA <= errB ? 'A' : 'B';
  } else if (rutaA_llena) {
    errorFinal = errA;
    rutaUsada = 'A';
  } else if (rutaB_llena) {
    errorFinal = errB;
    rutaUsada = 'B';
  } else {
    // Solo llenó P_i pero no el promedio
    feedback.hidden = false;
    feedback.className = 'feedback warn';
    feedback.innerHTML = '⚠️ Llenaste las P<sub>i</sub>, pero falta el valor final de presión.';
    return;
  }

  intentos++;

  // Clasificación
  let insignia, titulo, color;
  if (errorFinal < 1)       { insignia='🏆'; titulo='Precisión perfecta'; color='ok'; }
  else if (errorFinal < 3)  { insignia='🥇'; titulo='Excelente';          color='ok'; }
  else if (errorFinal < 7)  { insignia='🥈'; titulo='Muy bien';           color='ok'; }
  else if (errorFinal < 15) { insignia='🥉'; titulo='Aceptable';          color='warn'; }
  else                      { insignia='❌'; titulo='Necesitas revisar';  color='bad'; }

  // Bonus por usar las dos rutas
  let bonus = '';
  if (rutaA_llena && rutaB_llena) {
    const diffRutas = Math.abs(P_A_user - P_B_user) / Math.max(P_A_user, P_B_user) * 100;
    if (diffRutas < 2) {
      bonus = `<div class="bonus">🎁 <strong>Bonus:</strong> usaste las dos rutas y coinciden
              con solo ${diffRutas.toFixed(2)} % de diferencia. ¡Entendiste la conexión!</div>`;
    } else {
      bonus = `<div class="bonus">🤔 Usaste las dos rutas, pero difieren un
              ${diffRutas.toFixed(2)} %. Revisa cuál de las dos tiene el error.</div>`;
    }
  }

  // Pistas progresivas
  let pista = '';
  if (errorFinal >= 15) {
    if (intentos === 1) {
      pista = `<p style="margin-top:12px;color:#fbbf24;">
        💡 <strong>Pista 1:</strong> revisa si tus valores individuales de presión son
        consistentes entre sí. Si dan muy distintos, algo no cuadra.</p>`;
    } else if (intentos === 2) {
      pista = `<p style="margin-top:12px;color:#fbbf24;">
        💡 <strong>Pista 2:</strong> activa el botón del eje X en la gráfica y observa
        qué pasa con la recta.</p>`;
      btnUnidad.hidden = false;
    } else {
      pista = `<p style="margin-top:12px;color:#fbbf24;">
        💡 <strong>Pista 3:</strong> ¿en qué unidades debe estar la temperatura
        para que V sea directamente proporcional a T?</p>`;
      btnUnidad.hidden = false;
    }
  }

  if (trampaKelvin && errorFinal >= 15 && rutaA_llena) {
    pista = `<p style="margin-top:12px;color:#fbbf24;">
      💡 Algunas de tus P<sub>i</sub> coinciden con haber usado T en <em>°C</em> en
      lugar de K. Verifica cómo estás convirtiendo la temperatura.</p>`;
  } else if (inconsistentes === 0 && errorFinal >= 15 && rutaA_llena && !rutaB_llena) {
    pista = `<p style="margin-top:12px;color:#fbbf24;">
      💡 Tus P<sub>i</sub> individuales son correctas, pero el promedio final no.
      Revisa cómo calculaste el valor de la presión promedio.</p>`;
  }

  // Armar filas de resultado
  let lineasRutas = '';
  if (rutaA_llena) {
    lineasRutas += `<div class="fila">Ruta A (promedio): <strong>${P_A_user.toFixed(2)} kPa</strong>
      ${rutaA_ok ? '✅' : '❌'} — error ${errA.toFixed(2)} %</div>`;
  }
  if (rutaB_llena) {
    if (errB === null) {
      lineasRutas += `<div class="fila">Ruta B (gráfica): sin datos suficientes</div>`;
    } else {
      lineasRutas += `<div class="fila">Ruta B (gráfica): <strong>${P_B_user.toFixed(2)} kPa</strong>
        ${rutaB_ok ? '✅' : '❌'} — error ${errB.toFixed(2)} %</div>`;
    }
  }

  mostrarPantalla(pantallaResultado);
  document.getElementById('resultadoContenido').innerHTML = `
    <div class="resultado-card">
      <div class="insignia">${insignia}</div>
      <div class="titulo">${titulo}</div>
      ${lineasRutas}
      <div class="fila" style="margin-top:12px;padding-top:12px;border-top:1px solid #1e293b;">
        Presión real: <strong>${P_real.toFixed(2)} kPa</strong>
      </div>
      <div class="fila">Error final: <strong>${errorFinal.toFixed(2)} %</strong>
        <span style="color:#94a3b8;">(ruta ${rutaUsada})</span></div>
      ${bonus}
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
nValor.textContent    = n.toFixed(5);
nLab.textContent      = n.toFixed(5);
nAnalisis.textContent = n.toFixed(5);
