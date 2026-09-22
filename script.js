// ============================================================
// LABORATORIO VIRTUAL — LEY DE CHARLES
// ============================================================

// ---------- 1. MODELO FÍSICO (aleatorio cada sesión) ----------
const T0_C   = 25;
const T0_K   = T0_C + 273.15;
const V0     = 40 + Math.random() * 20;   // 40–60 mL
const K_REAL = V0 / T0_K;                 // constante real (mL/K)
const V_MAX  = 100;                       // escala del pistón y gráfico

function volumenReal(T_C) {
  return K_REAL * (T_C + 273.15);
}

// ---------- 2. ESTADO ----------
const mediciones    = [];      // [{ T_C, V }]
const MIN_MEDICIONES = 4;
let usarKelvin      = false;   // eje X de la gráfica

// ---------- 3. REFERENCIAS DOM ----------
const pantallaIntro     = document.getElementById('pantallaIntro');
const pantallaLab       = document.getElementById('pantallaLab');
const pantallaAnalisis  = document.getElementById('pantallaAnalisis');
const pantallaResultado = document.getElementById('pantallaResultado');

const sliderT       = document.getElementById('sliderT');
const tempLabel     = document.getElementById('tempLabel');
const volLabel      = document.getElementById('volLabel');
const btnRegistrar  = document.getElementById('btnRegistrar');
const btnIrAnalisis = document.getElementById('btnIrAnalisis');
const contador      = document.getElementById('contador');
const tbodyDatos    = document.querySelector('#tablaDatos tbody');

const tbodyAnalisis = document.querySelector('#tablaAnalisis tbody');
const inputK        = document.getElementById('inputK');
const btnVerificar  = document.getElementById('btnVerificar');
const feedback      = document.getElementById('feedback');

const gas    = document.getElementById('gas');
const piston = document.getElementById('piston');
const rod    = document.getElementById('rod');
const canvas = document.getElementById('grafica');
const ctx    = canvas.getContext('2d');

// ---------- 4. PISTÓN ----------
function dibujarPiston(T_C) {
  const V = volumenReal(T_C);

  const H_MAX  = 218;
  const Y_BASE = 268;

  const h     = Math.min((V / V_MAX) * H_MAX, H_MAX);
  const yGas  = Y_BASE - h;

  gas.setAttribute('y', yGas);
  gas.setAttribute('height', h);

  const yPiston = yGas - 16;
  piston.setAttribute('y', yPiston);

  rod.setAttribute('y', 20);
  rod.setAttribute('height', Math.max(yPiston - 20, 0));

  const hue = 220 - (T_C / 100) * 220;
  gas.setAttribute('fill', `hsl(${hue}, 80%, 60%)`);

  tempLabel.textContent = T_C.toFixed(1);
  volLabel.textContent  = V.toFixed(1);
}

// ---------- 5. GRÁFICA EN VIVO ----------
function dibujarGrafica() {
  const W = canvas.width, H = canvas.height, PAD = 42;

  ctx.clearRect(0, 0, W, H);

  // Ejes
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 10);
  ctx.lineTo(PAD, H - PAD);
  ctx.lineTo(W - 10, H - PAD);
  ctx.stroke();

  // Etiquetas
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.fillText(usarKelvin ? 'T (K)' : 'T (°C)', W / 2 - 15, H - 10);

  ctx.save();
  ctx.translate(14, H / 2 + 15);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('V (mL)', 0, 0);
  ctx.restore();

  // Rangos
  const xMin = usarKelvin ? 273 : 0;
  const xMax = usarKelvin ? 373 : 100;
  const yMin = 0, yMax = V_MAX;

  const mapX = x => PAD + (x - xMin) / (xMax - xMin) * (W - PAD - 15);
  const mapY = y => (H - PAD) - (y - yMin) / (yMax - yMin) * (H - PAD - 15);

  // Cuadrícula simple
  ctx.strokeStyle = '#1e293b';
  for (let i = 0; i <= 4; i++) {
    const y = mapY(i * yMax / 4);
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - 10, y); ctx.stroke();
  }

  // Puntos registrados
  mediciones.forEach(m => {
    const x = usarKelvin ? m.T_C + 273.15 : m.T_C;
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(mapX(x), mapY(m.V), 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Punto actual (posición del slider)
  const Tc = parseFloat(sliderT.value);
  const Vc = volumenReal(Tc);
  const xc = usarKelvin ? Tc + 273.15 : Tc;
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(mapX(xc), mapY(Vc), 6, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- 6. NAVEGACIÓN ----------
function mostrarPantalla(p) {
  [pantallaIntro, pantallaLab, pantallaAnalisis, pantallaResultado]
    .forEach(s => s.hidden = true);
  p.hidden = false;
}

// ---------- 7. LABORATORIO ----------
sliderT.addEventListener('input', () => {
  const T = parseFloat(sliderT.value);
  dibujarPiston(T);
  dibujarGrafica();
});

btnRegistrar.addEventListener('click', () => {
  const T_C = parseFloat(sliderT.value);
  const V   = Math.round(volumenReal(T_C) * 10) / 10;  // 1 decimal

  if (mediciones.some(m => Math.abs(m.T_C - T_C) < 0.5)) {
    alert('Ya registraste una medición a esa temperatura. Elige otra.');
    return;
  }

  mediciones.push({ T_C, V });
  actualizarTablaDatos();
  dibujarGrafica();
});

function actualizarTablaDatos() {
  tbodyDatos.innerHTML = '';
  mediciones.forEach((m, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i + 1}</td><td>${m.T_C.toFixed(1)}</td><td>${m.V.toFixed(1)}</td>`;
    tbodyDatos.appendChild(tr);
  });
  contador.textContent  = mediciones.length;
  btnIrAnalisis.disabled = mediciones.length < MIN_MEDICIONES;
}

btnIrAnalisis.addEventListener('click', () => {
  construirTablaAnalisis();
  mostrarPantalla(pantallaAnalisis);
});

// ---------- 8. ANÁLISIS ----------
function construirTablaAnalisis() {
  tbodyAnalisis.innerHTML = '';
  mediciones.forEach((m, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${m.T_C.toFixed(1)}</td>
      <td>${m.V.toFixed(1)}</td>
      <td><input type="number" step="0.01" data-fila="${i}" data-campo="TK"></td>
    `;
    tbodyAnalisis.appendChild(tr);
  });
}

btnVerificar.addEventListener('click', () => {
  // Leer entradas
  const filas = mediciones.map((m, i) => {
    const inTK = tbodyAnalisis.querySelector(`input[data-fila="${i}"][data-campo="TK"]`);
    return { T_C: m.T_C, V: m.V, TK_user: parseFloat(inTK.value), inTK };
  });

  if (filas.some(f => isNaN(f.TK_user)) || isNaN(parseFloat(inputK.value))) {
    feedback.hidden = false;
    feedback.className = 'feedback warn';
    feedback.innerHTML = '⚠️ Debes completar todos los campos antes de verificar.';
    return;
  }

  // Detectar "trampa Kelvin"
  let trampaKelvin = false;
  filas.forEach(f => {
    const esperado = f.T_C + 273.15;
    f.inTK.classList.remove('input-error');
    if (Math.abs(f.TK_user - esperado) / esperado > 0.05) {
      f.inTK.classList.add('input-error');
      if (Math.abs(f.TK_user - f.T_C) < 1) trampaKelvin = true;
    }
  });

  const kUser    = parseFloat(inputK.value);
  const errorPorc = Math.abs(kUser - K_REAL) / K_REAL * 100;

  // Clasificación
  let clasif, color;
  if (errorPorc < 2)       { clasif = '🏆 ¡Excelente!';      color = 'ok'; }
  else if (errorPorc < 5)  { clasif = '👍 Muy bien';          color = 'ok'; }
  else if (errorPorc < 10) { clasif = '🤔 Regular';           color = 'warn'; }
  else                     { clasif = '❌ Necesitas revisar'; color = 'bad'; }

  let pista = '';
  if (trampaKelvin) {
    pista = `<p style="margin-top:12px;color:#fbbf24;">
      💡 <strong>Pista:</strong> parece que olvidaste convertir de °C a K.
      Recuerda: <em>T(K) = T(°C) + 273.15</em>.</p>`;
  } else if (errorPorc > 10) {
    pista = `<p style="margin-top:12px;color:#fbbf24;">
      💡 Revisa que dividas V entre T en <strong>Kelvin</strong>
      y que copies bien las mediciones.</p>`;
  }

  mostrarPantalla(pantallaResultado);
  document.getElementById('resultadoContenido').innerHTML = `
    <div class="feedback ${color}">
      <h3>${clasif}</h3>
      <p>Tu constante: <strong>${kUser.toFixed(4)} mL/K</strong></p>
      <p>Valor real: <strong>${K_REAL.toFixed(4)} mL/K</strong></p>
      <p>Error relativo: <strong>${errorPorc.toFixed(2)} %</strong></p>
      ${pista}
    </div>`;
});

// ---------- 9. REINICIAR ----------
document.getElementById('btnReiniciar').addEventListener('click', () => location.reload());

// ---------- 10. ARRANQUE ----------
document.getElementById('btnComenzar').addEventListener('click', () => {
  mostrarPantalla(pantallaLab);
  dibujarPiston(parseFloat(sliderT.value));
  dibujarGrafica();
});

document.getElementById('btnUnidad').addEventListener('click', (e) => {
  usarKelvin = !usarKelvin;
  e.target.textContent = usarKelvin ? 'Eje X: K' : 'Eje X: °C';
  dibujarGrafica();
});