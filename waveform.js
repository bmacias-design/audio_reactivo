const WAVE_AUDIO_PATH = "./audio/Echoes.mp3"; 

let waveSong;
let waveAmplitude;
let waveFFT; 
let waveLevel = 0;
let prevLevel = 0; 
let currentTime = 0; 

// Variables de interacción y reproducción
let pressX = 0;
let isDragging = false;
let targetRate = 1.0;  
let currentRate = 1.0; 

// Sistema de ondas (ripples)
let ripples = [];
const MAX_RIPPLES = 15; 
let totalRipplesSpawned = 0; 

// Sistema de ráfagas de viento solar
let windGusts = [];

// Tiempo dinámico reactivo (Congela la física en silencios)
let reactiveTime = 0; 

// Sistema de rotación acumulativa para la espiral
let spiralRotationAngle = 0;
let currentRotationSpeed = 0.004;
let targetRotationSpeed = 0.004;

// Fuerza elástica de derretimiento interactivo localizado 
let localMeltStrength = 0;

// Coordenadas suavizadas del cursor (Efecto viscosidad/gelatina)
let smoothMouseX = 0;
let smoothMouseY = 0;

// Rejilla de hilos de densidad independiente por fase
let yStepInicio = 14;      
let yStepGroove = 14;      // Espaciado elegante para hilos Retrowave
let yStepRenacimiento = 10;
let xStep = 18;

// --- VARIABLES GLOBALES DE SELECCIÓN DE HILOS ---
let grabbedRowIdx = -1;      
let grabbedLayerIdx = -1;    

// Variables de reactividad fluida (Alta Sensibilidad)
let smoothWaveHeight = 1.0;  
let smoothWaveFreq = 0.015;  
let smoothTrebleShiver = 0.0; 
let currentBassScale = 1.0;
let currentMidScale = 1.0;
let currentTrebleScale = 1.0;
let prevPingEnergy = 0;
let lastPingFrame = 0;

// Intensidad del oleaje instrumental suavizado
let smoothInstrumentIntensity = 0;

// Paletas de color fijas
let colDropCyan, colDropRed, colOceanGreen, colOceanPurple;

// Colores del Prisma de Pink Floyd y de la Hélice 3D
let colPF1, colPF2, colPF3, colPF4, colPF5, colPF6;
let colHelixBlue, colHelixCopper;

// --- ESTRUCTURAS PARA LA FASE 4: EL VACÍO/CRIPTA ---
let cryptParticles = [];
let cryptWaves = []; 
let initializedCrypt = false;

function preload() {
  waveSong = loadSound(WAVE_AUDIO_PATH);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Inyección de CSS definitiva para eliminar el contorno blanco de forma forzada
  let styleOverride = document.createElement('style');
  styleOverride.innerHTML = `
    * {
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      outline: none !important;
    }
    html, body {
      width: 100% !important;
      height: 100% !important;
      background-color: #000000 !important;
      overflow: hidden !important;
    }
    canvas {
      display: block !important;
      border: none !important;
      outline: none !important;
    }
  `;
  document.head.appendChild(styleOverride);
  
  waveAmplitude = new p5.Amplitude();
  waveFFT = new p5.FFT();
  
  if (waveSong) {
    waveAmplitude.setInput(waveSong);
    waveFFT.setInput(waveSong);
  }
  
  smoothMouseX = width / 2;
  smoothMouseY = height / 2;
  
  colDropCyan = color(45, 100, 180);    
  colDropRed = color(185, 25, 40);      
  colOceanGreen = color(20, 145, 85);   
  colOceanPurple = color(120, 35, 165); 

  // --- COLORES PRIMARIOS DEL PRISMA DE PINK FLOYD ---
  colPF1 = color(255, 10, 50);    // Rojo
  colPF2 = color(255, 100, 10);   // Naranja
  colPF3 = color(240, 210, 20);   // Amarillo
  colPF4 = color(10, 230, 80);    // Verde
  colPF5 = color(10, 140, 255);   // Azul
  colPF6 = color(150, 20, 240);   // Violeta

  // --- COLORES DE LA HÉLICE DE VIDRIO 3D DE TU CAPTURA ---
  colHelixBlue = color(15, 45, 175);     // Azul índigo profundo reflectivo
  colHelixCopper = color(225, 115, 35);  // Cobre cálido de bajo ángulo
}

function draw() {
  background(0); 

  // Ajuste suave de velocidad
  currentRate = lerp(currentRate, targetRate, 0.05);
  if (waveSong && waveSong.isLoaded() && waveSong.isPlaying()) {
    waveSong.rate(currentRate);
  }

  // Amortiguación del movimiento del cursor para efecto viscoso (Gelatina)
  smoothMouseX = lerp(smoothMouseX, mouseX, 0.13);
  smoothMouseY = lerp(smoothMouseY, mouseY, 0.13);

  // --- COMPROBACIONES DE CARGA ---
  if (!waveSong) return;
  if (!waveSong.isLoaded()) {
      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(20);
      text("Sintetizando fluidos...", width / 2, height / 2);
      return; 
  }
  if (waveSong.isLoaded() && !waveSong.isPlaying()) {
    fill(255, 255, 255, 200);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(22);
    text("PINK FLOYD • ECHOES\n\n( Haz clic para iniciar la experiencia )\n\n[ Atajos: Presiona 1, 2, 3, 4 o 5 para saltar entre fases ]", width / 2, height / 2);
    return;
  }

  // --- OBTENER TIEMPO ACTUAL Y ESPECTRO ---
  if (waveSong.isPlaying()) {
    currentTime = waveSong.currentTime();
    waveLevel = lerp(waveLevel, waveAmplitude.getLevel(), 0.15);
    waveFFT.analyze();
    
    // El motor de tiempo reactivo acumula volumen para avanzar la animación física
    reactiveTime += waveLevel * 0.14 * currentRate;
    
    // --- CONTROL DE VELOCIDAD DE ROTACIÓN DE LA ESPIRAL ---
    let baseSpeed = 0.004;
    // Si estamos en la Fase de espiral (t >= 240) y el mouse está presionado, acelera visualmente sin alterar el audio
    if (currentTime >= 240 && mouseIsPressed) {
      targetRotationSpeed = 0.038; 
    } else {
      targetRotationSpeed = baseSpeed; 
    }
    currentRotationSpeed = lerp(currentRotationSpeed, targetRotationSpeed, 0.05);
    spiralRotationAngle += currentRotationSpeed * currentRate;

    // --- CARGA DE DERRETIMIENTO INTERACTIVO BAJO EL MOUSE (FASE 3) ---
    if (currentTime >= 240 && mouseIsPressed) {
      localMeltStrength = lerp(localMeltStrength, 1.0, 0.05); 
    } else {
      localMeltStrength = lerp(localMeltStrength, 0.0, 0.1);  
    }

    let bassEnergy = waveFFT.getEnergy("bass");
    let midEnergy = waveFFT.getEnergy("mid");
    let trebleEnergy = waveFFT.getEnergy("treble");
    
    currentBassScale = lerp(currentBassScale, map(bassEnergy, 50, 220, 0.5, 2.5, true), 0.2);
    currentMidScale = lerp(currentMidScale, map(midEnergy, 50, 180, 0.5, 2.2, true), 0.2);
    currentTrebleScale = lerp(currentTrebleScale, map(trebleEnergy, 20, 150, 0.5, 2.0, true), 0.2);

    // Control de altura de hilos reactiva (Graves) - Respuesta rápida elástica
    let targetHeight = map(bassEnergy, 40, 210, 0.6, 1.9, true);
    smoothWaveHeight = lerp(smoothWaveHeight, targetHeight, 0.16);

    // Control de micro-vibraciones / temblores (Agudos) - Respuesta rápida elástica
    let targetShiver = map(trebleEnergy, 15, 130, 0.0, 14.0, true);
    smoothTrebleShiver = lerp(smoothTrebleShiver, targetShiver, 0.15);

    // Control de ancho de onda reactiva (Agudos) - Respuesta rápida elástica
    let targetFreq = map(trebleEnergy, 15, 130, 0.012, 0.019, true);
    smoothWaveFreq = lerp(smoothWaveFreq, targetFreq, 0.12);

    // Detección automática del "Ping" (Fase 1)
    let pingEnergy = waveFFT.getEnergy(1500, 3200);
    let pingDelta = pingEnergy - prevPingEnergy;
    prevPingEnergy = pingEnergy;
    
    if (pingDelta > 18 && frameCount - lastPingFrame > 40) {
      if (currentTime < 60) {
        spawnRipple(); 
      }
      lastPingFrame = frameCount;
    }

    let bassNorm = map(bassEnergy, 90, 190, 0, 1, true);
    let midNorm = map(midEnergy, 70, 170, 0, 1, true);
    let targetIntensity = max(bassNorm, midNorm);
    smoothInstrumentIntensity = lerp(smoothInstrumentIntensity, targetIntensity, 0.03);

    // Detector de velocidad del mouse para viento solar
    let mouseVel = dist(mouseX, mouseY, pmouseX, pmouseY);
    if (mouseVel > 15 && currentTime >= 60 && currentTime < 420) {
      let dx = mouseX - pmouseX;
      let dy = mouseY - pmouseY;
      windGusts.push({
        x: pmouseX,
        y: pmouseY,
        vx: dx * 0.8,
        vy: dy * 0.8,
        radius: 10,
        life: 1.0
      });
    }

    // --- ACCIÓN DE DEJAR PRESIONADO (FORMACIÓN CONTINUA DE ONDAS CUADRADAS) ---
    // Solo permitida en Fase 1 y Fase 2 (currentTime < 240) para no entorpecer el derretimiento de Fase 3
    if (mouseIsPressed && frameCount % 22 === 0 && currentTime >= 60 && currentTime < 240) {
      spawnRipple(mouseX, mouseY, true); 
    }
  } else {
    currentTime = 0;
  }

  // Actualización de física de ráfagas de viento solar
  for (let i = windGusts.length - 1; i >= 0; i--) {
    let g = windGusts[i];
    g.radius += 8 * currentRate;  
    g.life -= 0.038 * currentRate; 
    if (g.life <= 0) {
      windGusts.splice(i, 1);
    }
  }

  // Actualización de física de gotas de lluvia y radios de ondas
  let maxR = Math.max(width, height) * 1.5; 
  for (let i = ripples.length - 1; i >= 0; i--) {
    let r = ripples[i];
    
    if (!r.hitGround) {
      r.dropletY += r.dropletSpeed;
      r.dropletSpeed += 1.5; 
      
      if (r.dropletY >= r.y) {
        r.hitGround = true;
        r.radius = 0; 
      }
    } else {
      r.radius += r.speed * currentRate;
      if (r.radius > maxR) {
        ripples.splice(i, 1);
      }
    }
  }

  // --- RENDERS TRANSICIONALES CON PESOS GRADUALES ---
  let weights = calculatePhaseWeights(currentTime);

  if (weights[0] > 0) drawSectionInicio(weights[0]);
  if (weights[1] > 0) drawSectionGroove(weights[1]);
  if (weights[2] > 0) drawSectionFunk(weights[2]);
  if (weights[3] > 0) drawSectionVacio(weights[3]);
  if (weights[4] > 0) drawSectionRenacimiento(weights[4]);

  drawHUD(currentTime);
}

// ==========================================
// FUNCIÓN AUXILIAR: GENERADOR PSEUDOALEATORIO ESTABLE
// ==========================================
function hashValue(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ==========================================
// FUNCIÓN AUXILIAR: CÁLCULO DE PESOS (FUSIÓN GRADUAL)
// ==========================================
function calculatePhaseWeights(t) {
  let w = [0, 0, 0, 0, 0];
  
  if (t < 60) {
    w[0] = 1.0;
  } else if (t < 120) { 
    let pct = (t - 60) / 60.0;
    w[0] = 1.0 - pct;
    w[1] = pct;
  } else if (t < 240) { // Fase 2 sola: de 2:00 a 4:00 [1]
    w[1] = 1.0;
  } else if (t < 300) { // Transición 2 -> 3: de 4:00 a 5:00 [1]
    let pct = (t - 240) / 60.0;
    w[1] = 1.0 - pct;
    w[2] = pct;
  } else if (t < 600) { // Fase 3: de 5:00 a 10:00 [1]
    w[2] = 1.0;
  } else if (t < 660) { // Transición 3 -> 4: 10:00 a 11:00 [1]
    let pct = (t - 600) / 60.0;
    w[2] = 1.0 - pct;
    w[3] = pct;
  } else if (t < 840) {
    w[3] = 1.0;
  } else if (t < 900) { 
    let pct = (t - 840) / 60.0;
    w[3] = 1.0 - pct;
    w[4] = pct;
  } else {
    w[4] = 1.0;
  }
  return w;
}

// ==========================================
// FUNCIÓN AUXILIAR: PINCEL DE GRAVEDAD (ESPACIO GLOBAL)
// ==========================================
function applyGravityBrush(gx, gy) {
  let outX = gx;
  let outY = gy;
  
  let dMouse = dist(gx, gy, mouseX, mouseY);
  let mouseVel = dist(mouseX, mouseY, pmouseX, pmouseY);
  
  if (dMouse < 220) {
    let pullStrength = cos(map(dMouse, 0, 220, 0, HALF_PI));
    let slowFactor = map(mouseVel, 0, 14, 1.0, 0, true); 
    
    // Atracción viscosa hacia la posición del mouse en ambos ejes
    let pullY = (mouseY - gy) * pullStrength * 0.3 * slowFactor;
    let pullX = (mouseX - gx) * pullStrength * 0.15 * slowFactor; 
    
    outY += pullY;
    outX += pullX;
  }
  
  return { x: outX, y: outY };
}

// ==========================================
// FUNCIÓN AUXILIAR: PINCEL DE MEZCLADO AL LIENZO (FASE 3) [1]
// ==========================================
function applyLadleStir(gx, gy) {
  let outX = gx;
  let outY = gy;
  
  if (currentTime >= 240) {
    let dMouse = dist(gx, gy, smoothMouseX, smoothMouseY);
    let pullRadius = 260; // Área de alcance de la cuchara [1]
    
    if (dMouse < pullRadius) {
      // Medimos la velocidad del mouse para calcular la fuerza de rotación [1]
      let mouseSpeed = dist(mouseX, mouseY, pmouseX, pmouseY);
      
      // Ángulo de torbellino local alrededor del mouse (más fuerte al estar más cerca) [1]
      let swirlAngle = map(mouseSpeed, 0, 50, 0, 0.22, true) * map(dMouse, 0, pullRadius, 1, 0, true);
      
      let dx = gx - smoothMouseX;
      let dy = gy - smoothMouseY;
      let cosS = cos(swirlAngle);
      let sinS = sin(swirlAngle);
      
      // Rotamos el hilo localmente alrededor del cursor para el torbellino [1]
      let swX = smoothMouseX + dx * cosS - dy * sinS;
      let swY = smoothMouseY + dx * sinS + dy * cosS;
      
      // Desplazamiento lineal (empuje físico de la cuchara en la sopa / mezclador) [1]
      let mouseVelX = mouseX - pmouseX;
      let mouseVelY = mouseY - pmouseY;
      let pushFactor = map(dMouse, 0, pullRadius, 0.95, 0, true);
      
      // Multiplicador de arrastre incrementado a 1.8x para simular el mezclado del óleo [1]
      outX = swX + mouseVelX * pushFactor * 1.8;
      outY = swY + mouseVelY * pushFactor * 1.8;
    }
  }
  return { x: outX, y: outY };
}

// ==========================================
// FUNCIÓN AUXILIAR: ROTACIÓN DE COORDENADAS LOCALES A GLOBALES (SIN JITTER RUIDOSO)
// ==========================================
function projectToGlobal(lx, ly, cx, cy, cosT, sinT) {
  return {
    x: cx + lx * cosT - ly * sinT,
    y: cy + lx * sinT + ly * cosT
  };
}

// Obtiene la rotación acumulativa para un giro constante
function getGrooveRotation() {
  if (currentTime >= 60) {
    return spiralRotationAngle; // Retorna el acumulador elástico del mouse
  }
  return 0;
}

// ==========================================
// FASE 1: EL INICIO (0:00 - 1:00 / TRANSICIÓN HASTA 2:00)
// ==========================================
function drawSectionInicio(weight) {
  noFill();
  
  let pingVol = waveFFT ? waveFFT.getEnergy(1500, 3200) : 0;
  // Animación del Leslie rota estrictamente en sync con la fluctuación de sonido
  let lesliePulse = sin(reactiveTime * 1.2) * (pingVol / 255.0) * 16;

  // --- RENDIMIENTO DINÁMICO DE IMPACTO EN FASE 1 ---
  // Calculamos la frescura de la gota más joven para modular el destello de la red
  let maxAgeFactor = 0;
  for (let r of ripples) {
    if (r.hitGround) {
      let age = map(r.radius, 0, width * 0.8, 1.0, 0, true);
      if (age > maxAgeFactor) maxAgeFactor = age;
    }
  }

  // Si no hay ondas, la red es completamente negra. Al impactar una gota, destella en blanco/cyan
  // y gradualmente se degrada hacia un azul marino abisal oscuro [1]
  let darkAbisalBlue1 = color(10, 25, 65);
  let darkAbisalBlue2 = color(5, 15, 45);
  let ultraBright1 = color(220, 245, 255); // Destello blanco/cyan ultra brillante [1]
  let ultraBright2 = color(150, 210, 255);
  
  let colWater1 = lerpColor(darkAbisalBlue1, ultraBright1, maxAgeFactor);
  let colWater2 = lerpColor(darkAbisalBlue2, ultraBright2, maxAgeFactor);
  
  for (let y = -20; y < height + 20; y += yStepInicio) {
    let rowIdx = floor((y + 20) / yStepInicio);
    
    let blendedColor = (rowIdx % 2 === 0) ? colWater1 : colWater2;
    stroke(red(blendedColor), green(blendedColor), blue(blendedColor), 180 * weight);
    
    let weightBase = (rowIdx % 2 === 0) ? 1.6 : 1.1;
    let dynamicWeight = weightBase * (1.0 + pingVol / 120.0);
    strokeWeight(dynamicWeight);
    
    beginShape();
    for (let x = -150; x <= width + 150; x += xStep) {
      let res = calculateInicioWaveAt(x, y);
      vertex(x, y + res.displacementY);
    }
    endShape();
  }

  // Gota aérea cayendo con estela blanca súper brillante [1]
  for (let r of ripples) {
    if (!r.hitGround) {
      stroke(240, 250, 255, 180 * weight); // Estela blanca brillante [1]
      strokeWeight(2.0);
      line(r.x, r.dropletY - 20, r.x, r.dropletY);
      
      fill(255, 255, 255, 255 * weight); // Núcleo blanco sólido [1]
      noStroke();
      ellipse(r.x, r.dropletY, 6, 10);
    }
  }
}

function calculateInicioWaveAt(x, y) {
  let totalDisplacementY = 0;
  let maxAlpha = 0;
  
  for (let r of ripples) {
    if (r.hitGround) {
      let dx = x - r.x;
      let dy = (y - r.y) / 0.55; 
      let dEllipse = sqrt(dx * dx + dy * dy); 
      
      let baseScale = r.sizeScale || 1.0;
      let wavefrontWidth = (r.wavefrontWidth || 180) * baseScale;
      let distFromWavefront = abs(dEllipse - r.radius);
      
      if (distFromWavefront < wavefrontWidth) {
        let envelope = exp(-sq(distFromWavefront / (wavefrontWidth * 0.5)));
        
        let directionSign = r.counterCurrent ? 1 : -1;
        let waveValue = sin(dEllipse * 0.02 + directionSign * r.radius * 0.05);
        let ageFactor = map(r.radius, 0, width * 0.8, 1.0, 0, true);
        
        let rippleAmp = envelope * waveValue * 30 * ageFactor * baseScale; 
        totalDisplacementY += rippleAmp;
        
        maxAlpha = max(maxAlpha, envelope * ageFactor * 240);
      }
    }
  }
  
  return { displacementY: totalDisplacementY, alpha: maxAlpha };
}

// ==========================================
// FASE 2: EL GROOVE (1:00 - 4:00 / TRANSICIÓN ROTATORIA HASTA 5:00) [1]
// ==========================================
function drawSectionGroove(weight) {
  drawSectionGrooveExt(weight, 0); 
}

// Función modular del Groove extendida para soportar el factor de derretimiento ("meltFactor") [1]
function drawSectionGrooveExt(weight, meltFactor = 0) {
  strokeCap(ROUND);
  strokeJoin(ROUND);

  let echoPct = (currentTime >= 220) ? map(currentTime, 220, 250, 0, 1, true) : 0;
  
  if (echoPct > 0) {
    renderGrooveGrid(weight * echoPct * 0.45, true, 0, meltFactor); 
  }
  
  renderGrooveGrid(weight, false, 0, meltFactor);
}

// Renderizador modular de la Fase 2 (Soporta delay de eco y derretimiento) [1]
function renderGrooveGrid(weightMult, isEcho, rotationOffset = 0, meltFactor = 0) {
  let timeVal = isEcho ? (currentTime - 0.15) : currentTime;
  let phaseVal = isEcho ? (reactiveTime - 0.25) : reactiveTime;

  // --- PALETA LUMINOSA Y VIVA DE PINK FLOYD (THE DARK SIDE OF THE MOON SPECTRUM) ---
  let p2Progress = map(timeVal, 60, 240, 0, 1, true); 

  // Distribución del prisma arcoíris a través de las filas (Red, Orange, Yellow, Green, Blue, Violet) [1]
  let colLava1 = colPF1; // Rojo  
  let colLava2 = colPF2; // Naranja  
  let colLava3 = colPF3; // Amarillo  
  let colLava4 = colPF4; // Verde  
  let colLava5 = colPF5; // Azul  
  let colLava6 = colPF6; // Violeta  
  
  // Fusión suave cromática progresiva desde el minuto 4:00 (240s) hacia los colores complementarios de la Fase 3 [1]
  // La Fase 3 utiliza un Indigo Profundo y un Cobre cálido de bajo ángulo (complementarios)
  let morphToMonochrome = map(timeVal, 240, 300, 0, 1, true);

  // El tamaño del lienzo se calcula en base a la diagonal de pantalla
  let cx = width / 2;
  let cy = height / 2;
  let diag = sqrt(width * width + height * height) * 1.1; 
  
  let theta = getGrooveRotation() + rotationOffset; 
  let cosT = cos(theta);
  let sinT = sin(theta);

  // --- VARIABLES DE EVOLUCIÓN DE ESPIRAL Y GROSOR ---
  let spiralMorphPct = map(timeVal, 240, 300, 0, 1, true); 
  let dynamicThicknessFactor = map(p2Progress, 0, 1, 1.0, 3.5, true);

  // --- ESCALADO ELÁSTICO DE ENCOGIMIENTO HACIA EL VACIO DE FASE 4 [1] ---
  let shrinkToVacio = 1.0;
  if (timeVal >= 600 && timeVal < 660) {
    shrinkToVacio = map(timeVal, 600, 660, 1.0, 0.0, true);
  }

  // Detector de agudos de la pista para destello reactivo
  let trebleGlow = map(waveFFT.getEnergy("treble"), 20, 130, 0, 100, true);

  // Brillo elástico
  let dynamicGlowFactor = map(p2Progress, 0, 0.4, 0.15, 1.0, true);

  // --- DETECTOR DE FRENESÍ DE FRECUENCIA AL MINUTO 3:30 (210s) [1] ---
  let frenzyFactor = 1.0;
  if (timeVal >= 210) {
    frenzyFactor = map(timeVal, 210, 240, 1.0, 3.0, true);
  }

  for (let y = -diag/2; y < diag/2; y += yStepGroove) {
    let rowIdx = floor((y + diag/2) / yStepGroove);
    
    // Mapeo dinámico complementario para la Fase 3 (Índigo y Cobre) [1]
    let m1 = (rowIdx % 2 === 0) ? colHelixBlue : colHelixCopper;
    let m2 = (rowIdx % 2 === 1) ? colHelixCopper : colHelixBlue;

    let blendedColor;
    let pattern = rowIdx % 6;
    if (pattern === 0) blendedColor = lerpColor(colLava1, m1, morphToMonochrome);
    else if (pattern === 1) blendedColor = lerpColor(colLava2, m2, morphToMonochrome);
    else if (pattern === 2) blendedColor = lerpColor(colLava3, m1, morphToMonochrome);
    else if (pattern === 3) blendedColor = lerpColor(colLava4, m2, morphToMonochrome);
    else if (pattern === 4) blendedColor = lerpColor(colLava5, m1, morphToMonochrome);
    else blendedColor = lerpColor(colLava6, m2, morphToMonochrome);
    
    // --- EFECTO DE DESTELLO REACTIVO A LOS TONOS ALTOS (TREBLE GLOW) ---
    let rComp = red(blendedColor);
    let gComp = green(blendedColor);
    let bComp = blue(blendedColor);
    
    if (timeVal < 240) {
      rComp = constrain(rComp + trebleGlow * 0.7 * dynamicGlowFactor, 0, 255);
      gComp = constrain(gComp + trebleGlow * 0.9 * dynamicGlowFactor, 0, 255); 
      bComp = constrain(bComp + trebleGlow * 1.1 * dynamicGlowFactor, 0, 255);
    }
    
    // --- EFECTO PINCEL DE MEZCLADO AL LIENZO (EXCLUSIVO FASE 3: t >= 240) [1] ---
    let isPhase3Active = (timeVal >= 240);
    
    // --- GROSOR DE HILOS DELGADOS TOTALMENTE REORGANIZADO Y ESPONTÁNEO ---
    let h = hashValue(rowIdx);
    let weightBase = 1.0;
    let alphaMultiplier = 1.0;
    
    if (timeVal < 240) {
      if (h < 0.22) {
        weightBase = map(hashValue(rowIdx + 13), 0, 1, 1.6, 2.3);
        alphaMultiplier = 1.0;
      } else if (h < 0.45) {
        weightBase = map(hashValue(rowIdx + 29), 0, 1, 0.8, 1.4);
        alphaMultiplier = map(hashValue(rowIdx + 47), 0, 1, 0.7, 0.9);
      } else if (h < 0.8) {
        weightBase = map(hashValue(rowIdx + 71), 0, 1, 0.25, 0.6);
        alphaMultiplier = map(hashValue(rowIdx + 83), 0, 1, 0.35, 0.65);
      } else {
        weightBase = map(hashValue(rowIdx + 97), 0, 1, 0.06, 0.18);
        alphaMultiplier = map(hashValue(rowIdx + 113), 0, 1, 0.1, 0.3);
      }
    } else {
      // --- NUEVO MATERIAL SUAVE EN FASE 3 (MEMBRANA LIQUIDA UNIFICADA) [1] ---
      // Reemplaza la textura rígida por un gradiente elástico senoidal continuo [1]
      weightBase = map(sin(rowIdx * 0.15), -1, 1, 0.8, 1.8);
      alphaMultiplier = map(cos(rowIdx * 0.15), -1, 1, 0.6, 0.95);
    }

    let dynamicAlpha = constrain(200 * (0.8 + waveLevel * 2.0) * weightMult * alphaMultiplier * dynamicGlowFactor, 0, 255); 
    
    if (dynamicAlpha > 5) {
      // --- 1. DIBUJO POR TRAYECTORIAS VECTORIALES COMPLETAS (Resuelve de forma definitiva e impecable el bug de bolitas) ---
      stroke(rComp, gComp, bComp, dynamicAlpha);
      
      let dynamicWeight = weightBase * (0.4 + currentMidScale * 1.5) * dynamicThicknessFactor;
      strokeWeight(dynamicWeight);
      
      noFill();
      beginShape();
      
      for (let x = -diag/2; x <= diag/2 + xStep; x += xStep) {
        let localX = x;
        let res = calculateGrooveWaveAtExt(localX + cx, y + cy, timeVal, phaseVal, rowIdx, frenzyFactor);
        let localYDisplaced = y + res.displacementY;
        
        // --- EFECTO DE ESPIRAL DE COMPRESIÓN CARDIODE (MUESTRA LA ILUSIÓN DE CORAZÓN) ---
        if (timeVal >= 240) {
          let dCenter = sqrt(localX * localX + localYDisplaced * localYDisplaced);
          if (dCenter < 400) {
            let pinch = map(dCenter, 0, 400, 140, 0, true) * map(timeVal, 240, 300, 0, 1, true);
            let angleCenter = atan2(localYDisplaced, localX);
            let heartFactor = 1.0 + sin(angleCenter) * 0.55; 
            localX *= (1.0 - (pinch / 400) * heartFactor * 0.48);
            localYDisplaced *= (1.0 - (pinch / 400) * heartFactor * 0.48);
          }
        }

        // Enroscamiento matemático en espiral [1]
        if (spiralMorphPct > 0) {
          let dCenter = sqrt(localX * localX + localYDisplaced * localYDisplaced);
          
          // Reactividad ampliada en Fase 3 ligada a graves [1]
          let audioTwistBoost = 1.0 + waveLevel * 4.5;
          let twistDensity = map(spiralMorphPct, 0, 1, 0, 0.0035, true);
          
          // --- FÍSICA DE VÓRTICE DE SUMIDERO CENTRAL (SINK VORTEX) [1] ---
          // Espiral se enrosca de forma ultra-apretada hacia (0,0) conforme dCenter se acerca a 0 [1]
          let twistCenterBoost = (40.0 / (dCenter + 12.0)) * spiralMorphPct; 
          
          let twist = (dCenter * twistDensity + twistCenterBoost) * TWO_PI * audioTwistBoost;
          
          let cosTwist = cos(twist);
          let sinTwist = sin(twist);
          let tempX = localX * cosTwist - localYDisplaced * sinTwist;
          let tempY = localX * sinTwist + localYDisplaced * cosTwist;
          localX = tempX;
          localYDisplaced = tempY;
        }

        // --- EFECTO DE DERRETIMIENTO LOCALIZADO EN FASE 3 ---
        let tempGlob = projectToGlobal(localX, localYDisplaced, cx, cy, cosT, sinT);
        let dMouse = dist(tempGlob.x, tempGlob.y, smoothMouseX, smoothMouseY);
        
        let localMeltPct = 0;
        if (dMouse < 280) {
          localMeltPct = map(dMouse, 0, 280, 1.0, 0.0, true) * localMeltStrength;
        }

        let activeMelt = max(meltFactor, localMeltPct);

        if (activeMelt > 0.01) {
          let lx = localX;
          let ly = localYDisplaced;
          
          let meltNoise = noise(lx * 0.004, ly * 0.004, reactiveTime * 1.2);
          let shrink = map(meltNoise, 0, 1, 0.5, 1.25) * activeMelt * (0.5 + waveLevel * 3.5);
          lx = lx * (1.0 - shrink * 0.32);
          ly = ly * (1.0 - shrink * 0.32);
          
          let extraTwist = meltNoise * TWO_PI * 0.42 * activeMelt;
          let cosE = cos(extraTwist);
          let sinE = sin(extraTwist);
          localX = lx * cosE - ly * sinE;
          localYDisplaced = lx * sinE + ly * cosE;
        }
        
        // --- PROYECCIÓN DE ENCOGIMIENTO DE ESPIRAL HACIA EL VACIO (Fases 3 -> 4) [1] ---
        if (timeVal >= 600) {
          localX *= shrinkToVacio;
          localYDisplaced *= shrinkToVacio;
        }

        let glob = projectToGlobal(localX, localYDisplaced, cx, cy, cosT, sinT);
        let finalX = glob.x;
        let finalY = glob.y;
        
        // --- EFECTO PINCEL DE MEZCLADO AL LIENZO (CAMBIO DE COLOR EN FASE 3) ---
        if (isPhase3Active) {
          let dBlend = dist(finalX, finalY, smoothMouseX, smoothMouseY);
          if (dBlend < 180) {
            let mixStrength = map(dBlend, 0, 180, 0.72, 0, true);
            let mixColor = color((reactiveTime * 25) % 360, 85, 95); 
            
            colorMode(HSB, 360, 100, 100, 1);
            let mixedR = lerp(rComp, red(mixColor), mixStrength);
            let mixedG = lerp(gComp, green(mixColor), mixStrength);
            let mixedB = lerp(bComp, blue(mixColor), mixStrength);
            colorMode(RGB, 255, 255, 255, 255);
            
            stroke(mixedR, mixedG, mixedB, dynamicAlpha);
          }
        }

        let grav = applyGravityBrush(finalX, finalY);
        let stirred = applyLadleStir(grav.x, grav.y);
        
        vertex(stirred.x, stirred.y); 
      }
      endShape();

      // --- 2. DIBUJO DE ESTELA DE BRILLO ESPECULAR EN 3D ---
      // Se corrigió eliminando prevX y prevY, usando un segundo beginShape() idéntico con un desfase constante arriba
      if (pattern % 2 === 0 && dynamicAlpha > 20) {
        stroke(255, 255, 255, dynamicAlpha * 0.65);
        strokeWeight(dynamicWeight * 0.26); 
        noFill();
        beginShape();
        
        for (let x = -diag/2; x <= diag/2 + xStep; x += xStep) {
          let localX = x;
          let res = calculateGrooveWaveAtExt(localX + cx, y + cy, timeVal, phaseVal, rowIdx, frenzyFactor);
          let localYDisplaced = y + res.displacementY;
          
          if (timeVal >= 240) {
            let dCenter = sqrt(localX * localX + localYDisplaced * localYDisplaced);
            if (dCenter < 400) {
              let pinch = map(dCenter, 0, 400, 140, 0, true) * map(timeVal, 240, 300, 0, 1, true);
              let angleCenter = atan2(localYDisplaced, localX);
              let heartFactor = 1.0 + sin(angleCenter) * 0.55; 
              localX *= (1.0 - (pinch / 400) * heartFactor * 0.48);
              localYDisplaced *= (1.0 - (pinch / 400) * heartFactor * 0.48);
            }
          }

          if (spiralMorphPct > 0) {
            let dCenter = sqrt(localX * localX + localYDisplaced * localYDisplaced);
            let audioTwistBoost = 1.0 + waveLevel * 4.5;
            let twistDensity = map(spiralMorphPct, 0, 1, 0, 0.0035, true);
            let twistCenterBoost = (40.0 / (dCenter + 12.0)) * spiralMorphPct; 
            
            let twist = (dCenter * twistDensity + twistCenterBoost) * TWO_PI * audioTwistBoost;
            
            let cosTwist = cos(twist);
            let sinTwist = sin(twist);
            let tempX = localX * cosTwist - localYDisplaced * sinTwist;
            let tempY = localX * sinTwist + localYDisplaced * cosTwist;
            localX = tempX;
            localYDisplaced = tempY;
          }

          let tempGlob = projectToGlobal(localX, localYDisplaced, cx, cy, cosT, sinT);
          let dMouse = dist(tempGlob.x, tempGlob.y, smoothMouseX, smoothMouseY);
          let localMeltPct = 0;
          if (dMouse < 280) {
            localMeltPct = map(dMouse, 0, 280, 1.0, 0.0, true) * localMeltStrength;
          }
          let activeMelt = max(meltFactor, localMeltPct);

          if (activeMelt > 0.01) {
            let lx = localX;
            let ly = localYDisplaced;
            let meltNoise = noise(lx * 0.004, ly * 0.004, reactiveTime * 1.2);
            let shrink = map(meltNoise, 0, 1, 0.5, 1.25) * activeMelt * (0.5 + waveLevel * 3.5);
            lx = lx * (1.0 - shrink * 0.32);
            ly = ly * (1.0 - shrink * 0.32);
            
            let extraTwist = meltNoise * TWO_PI * 0.42 * activeMelt;
            let cosE = cos(extraTwist);
            let sinE = sin(extraTwist);
            localX = lx * cosE - ly * sinE;
            localYDisplaced = lx * sinE + ly * cosE;
          }
          
          if (timeVal >= 600) {
            localX *= shrinkToVacio;
            localYDisplaced *= shrinkToVacio;
          }

          let glob = projectToGlobal(localX, localYDisplaced, cx, cy, cosT, sinT);
          let grav = applyGravityBrush(glob.x, glob.y);
          let stirred = applyLadleStir(grav.x, grav.y);
          
          vertex(stirred.x, stirred.y - 1.6); 
        }
        endShape();
      }
    }
  }
}

function calculateGrooveWaveAtExt(x, y, timeVal, phaseVal, rowIdx, frenzyFactor = 1.0) {
  let totalDisplacementY = 0;
  let maxAlpha = 0;
  
  // --- INYECTAR TENSIÓN ACÚSTICA SUTIL DE FIN DE FASE 2 ---
  let aggressionFactor = 1.0;
  if (timeVal >= 300 && timeVal < 420) {
    aggressionFactor = map(timeVal, 300, 390, 1.0, 1.25, true); 
  }

  // Factor de escala de volumen instantáneo (Se aplana al 100% en silencios completos)
  let audioVolumeFactor = map(waveLevel, 0.005, 0.28, 0.0, 2.2, true);

  for (let r of ripples) {
    if (r.hitGround) { 
      let d = dist(x, y, r.x, r.y);
      
      // --- INTERACCIÓN DE FIGURA CUADRADA (DISTANCIA CHEBYSHEV) ---
      if (r.isSquare) {
        d = max(abs(x - r.x), abs(y - r.y)); 
      }

      let baseScale = r.sizeScale || 1.0;
      let wavefrontWidth = (r.wavefrontWidth || 280) * baseScale; 
      let distFromWavefront = abs(d - r.radius);
      
      if (distFromWavefront < wavefrontWidth) {
        let envelope = exp(-sq(distFromWavefront / (wavefrontWidth * 0.6)));
        let directionSign = r.counterCurrent ? 1 : -1;
        
        // --- MOVIMIENTO CONTRA CORRIENTE DE ONDAS CRUZADAS (FILAS INTERSECTANTES) ---
        let rowDirection = (rowIdx % 2 === 0) ? 1 : -1;
        let waveValue = sin(d * smoothWaveFreq * frenzyFactor + directionSign * r.radius * 0.05 * aggressionFactor + x * 0.006 * rowDirection);
        
        let ageFactor = map(r.radius, 0, width * 0.85, 1.0, 0, true);
        
        let rippleAmp = envelope * waveValue * 25 * ageFactor * smoothWaveHeight * baseScale * audioVolumeFactor;
        totalDisplacementY += rippleAmp;
        
        // El Shiver tiembla de forma reactiva al tiempo musical dinámico
        if (smoothTrebleShiver > 0.1) {
          let shiverFreq = 0.22;
          let shiverValue = sin(x * shiverFreq + phaseVal * 20.0 * aggressionFactor * frenzyFactor) * smoothTrebleShiver * ageFactor * 0.35 * aggressionFactor;
          totalDisplacementY += shiverValue;
        }
        
        maxAlpha = max(maxAlpha, envelope * ageFactor * 255);
      }
    }
  }
  
  // Modulación de ruido líquido reactivo
  let fluidNoise = noise(x * 0.002, y * 0.003 + phaseVal * 0.6, phaseVal * 1.0);
  let fluidY = (fluidNoise - 0.45) * 120 * smoothWaveHeight * waveLevel * 2.5; 
  totalDisplacementY += fluidY;
  
  maxAlpha = max(maxAlpha, (smoothInstrumentIntensity * 1.25) * 180);
  
  return { displacementY: totalDisplacementY, alpha: maxAlpha };
}

// ==========================================
// FASE 3: ILUSIÓN ÓPTICA - VÓRTICE EN ESPIRAL ENROSCADO Y DERRETIDO (5:00 - 10:00) [1]
// ==========================================
function drawSectionFunk(weight) {
  let p3Progress = map(currentTime, 300, 600, 0, 1, true);
  
  // Campana de Gauss Temporal
  let meltFactor = sin(p3Progress * PI); 
  
  // Ecos de retraso visual del vórtice (Loop Eco Espiral) [1]
  if (meltFactor > 0.05) {
    renderGrooveGrid(weight * 0.42 * meltFactor, true, -0.16, meltFactor); 
    renderGrooveGrid(weight * 0.26 * meltFactor, true, -0.32, meltFactor); 
  }
  
  drawSectionGrooveExt(weight, meltFactor);
}

// ==========================================
// FASE 4: EL VACÍO/CRIPTA (11:00 - 15:00)
// ==========================================
function drawSectionVacio(weight) {
  initCrypt();
  
  if (random(1) < 0.25) {
    stroke(110, 110, 110, random(40, 120) * weight);
    strokeWeight(0.5);
    let glY = random(height);
    line(random(width * 0.05), glY, random(width * 0.95, width), glY);
  }
  
  for (let p of cryptParticles) {
    p.x += p.vx;
    p.y += p.vy;
    
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;
    
    let d = dist(mouseX, mouseY, p.x, p.y);
    let alpha = 0;
    if (d < 180) {
      alpha = map(d, 0, 180, 210, 0) * weight;
    }
    
    if (alpha > 5) {
      fill(210, alpha);
      noStroke();
      ellipse(p.x, p.y, p.size);
    }
  }
  
  let soundPulse = map(waveLevel, 0.01, 0.32, 0.75, 1.85, true);

  for (let cw of cryptWaves) {
    cw.x += cw.vx;
    cw.y += cw.vy;
    
    if (cw.x < -100) cw.x = width + 100;
    if (cw.x > width + 100) cw.x = -100;
    if (cw.y < -100) cw.y = height + 100;
    if (cw.y > height + 100) cw.y = -100;

    let aStep = 0.15; 
    
    for (let j = 0; j < cw.numRings; j++) {
      let ringRad = (cw.baseRad + j * 16) * soundPulse;
      
      let prevX = cw.x + cos(0) * ringRad;
      let prevY = cw.y + sin(0) * ringRad * 0.55;
      
      for (let a = aStep; a <= TWO_PI + aStep; a += aStep) {
        let currX = cw.x + cos(a) * ringRad;
        let currY = cw.y + sin(a) * ringRad * 0.55; 
        
        let midX = (prevX + currX) / 2;
        let midY = (prevY + currY) / 2;
        let d = dist(midX, midY, mouseX, mouseY);
        
        let lightAlpha = 0;
        let flashlightRadius = 190;
        
        if (d < flashlightRadius) {
          lightAlpha = map(d, 0, flashlightRadius, 255, 0) * weight;
        }
        
        if (lightAlpha > 5) {
          stroke(185, 25, 40, lightAlpha * 0.85);
          strokeWeight((1.0 + waveLevel * 5.0) * (1.0 - j * 0.12)); 
          line(prevX, prevY, currX, currY);
        }
        
        prevX = currX;
        prevY = currY;
      }
    }
  }
  
  noFill();
  for (let r = 180; r > 0; r -= 15) {
    let edgeAlpha = map(r, 0, 180, 12, 0) * weight;
    fill(255, 255, 255, edgeAlpha);
    ellipse(mouseX, mouseY, r * 2);
  }
}

function initCrypt() {
  if (initializedCrypt) return;
  
  for (let i = 0; i < 45; i++) {
    cryptParticles.push({
      x: random(width),
      y: random(height),
      size: random(1.5, 5),
      vx: random(-0.35, 0.35),
      vy: random(-0.35, 0.35)
    });
  }
  
  for (let i = 0; i < 11; i++) {
    cryptWaves.push({
      x: random(width * 0.1, width * 0.9),
      y: random(height * 0.1, height * 0.9),
      baseRad: random(30, 70),
      numRings: floor(random(3, 6)),
      vx: random(-0.25, 0.25),
      vy: random(-0.25, 0.25)
    });
  }
  
  initializedCrypt = true;
}

// ==========================================
// FASE 5: EL RENACIMIENTO (15:00 - Fin)
// ==========================================
function drawSectionRenacimiento(weight) {
  colorMode(HSB, 360, 100, 100, 1);
  noFill();
  
  if (dist(mouseX, mouseY, pmouseX, pmouseY) > 2.5 && frameCount % 3 === 0) {
    spawnRipple(mouseX, mouseY);
  }
  
  for (let y = -20; y < height + 20; y += yStepRenacimiento) {
    let rowIdx = floor((y + 20) / yStepRenacimiento);
    let hueVal = (rowIdx * 5 + frameCount * 0.5) % 360;
    
    stroke(hueVal, 85, 100, 0.45 * weight);
    strokeWeight(1.5);
    
    beginShape();
    for (let x = -150; x <= width + 150; x += xStep) {
      let res = calculateRenacimientoWaveAt(x, y);
      vertex(x, y + res.displacementY);
    }
    endShape();
  }
  
  colorMode(RGB, 255, 255, 255, 255);
}

function calculateRenacimientoWaveAt(x, y) {
  let totalDisplacementY = 0;
  let maxAlpha = 0;
  
  for (let r of ripples) {
    if (r.hitGround) {
      let d = dist(x, y, r.x, r.y);
      let distFromWavefront = abs(d - r.radius);
      if (distFromWavefront < r.wavefrontWidth) {
        let envelope = exp(-sq(distFromWavefront / (r.wavefrontWidth * 0.5)));
        let waveValue = sin(d * 0.06 - r.radius * 0.14);
        let ageFactor = map(r.radius, 0, width * 1.6, 1.0, 0, true);
        totalDisplacementY += envelope * waveValue * 70 * ageFactor;
        maxAlpha = max(maxAlpha, envelope * ageFactor); 
      }
    }
  }
  
  let noiseVal = noise(x * 0.003, y * 0.003 + frameCount * 0.007, frameCount * 0.012);
  totalDisplacementY += (noiseVal - 0.45) * 110;
  
  maxAlpha = max(maxAlpha, 0.45); 
  
  return { displacementY: totalDisplacementY, alpha: maxAlpha };
}

// ==========================================
// SISTEMA AUXILIAR Y CONTROLES
// ==========================================
function spawnRipple(customX, customY, forceSquare) {
  if (ripples.length > MAX_RIPPLES) {
    ripples.shift(); 
  }

  let nx, ny, nw;
  
  if (currentTime < 120) { 
    if (totalRipplesSpawned === 0) {
      nx = width / 2;
      ny = height / 2;
    } else {
      nx = customX !== undefined ? customX : random(width * 0.15, width * 0.85);
      ny = customY !== undefined ? customY : random(height * 0.15, height * 0.85);
    }
    nw = random(120, 240); 
  } else {
    nx = customX !== undefined ? customX : (width / 2 + random(-width/5, width/5));
    ny = customY !== undefined ? customY : (height / 2 + random(-height/5, height/5));
    nw = 280;      
  }

  let instant = (currentTime >= 60) || (grabbedRowIdx !== -1); 

  ripples.push({
    id: frameCount + floor(random(1000)), 
    x: nx,
    y: ny,
    radius: 0,
    speed: random(1.8, 3.2), 
    wavefrontWidth: nw,
    dropletY: ny - 350,   
    dropletSpeed: 12,    
    hitGround: instant,
    counterCurrent: random(1) < 0.35, 
    sizeScale: random(0.55, 1.85),
    isSquare: forceSquare || false 
  });

  totalRipplesSpawned++;
}

function drawHUD(timeSec) {
  let minutes = floor(timeSec / 60);
  let seconds = floor(timeSec % 60);
  let timeString = nf(minutes, 2) + ":" + nf(seconds, 2);
  
  let phaseName = "";
  if (timeSec < 60) phaseName = "Fase 1: El Inicio (Ondas 3D de Agua Profunda)";
  else if (timeSec < 120) phaseName = "Fase 1 -> 2 (Fusión de Ondas)";
  else if (timeSec < 240) phaseName = "Fase 2: El Groove (Viscosidad Gelatinosa & Eco Visual)";
  else if (timeSec < 300) phaseName = "Fase 2 -> 3 (Fusión Funk & Vórtice de Cebra)";
  else if (timeSec < 600) phaseName = "Fase 3: Funk Psicodélico (Vórtice Cebra Licuado)";
  else if (timeSec < 660) phaseName = "Fase 3 -> 4 (Fusión de Cripta)";
  else if (timeSec < 840) phaseName = "Fase 4: El Vacío / Cripta (Ondas Ocultas)";
  else if (timeSec < 900) phaseName = "Fase 4 -> 5 (Fusión del Clímax)";
  else phaseName = "Fase 5: El Renacimiento (Pintura Colectiva)";

  fill(255, 120);
  noStroke();
  textAlign(LEFT, BOTTOM);
  textSize(14);
  textFont('Courier New');
  text(timeString + " | " + phaseName + "\n[Presiona teclas 1-5 para saltar entre fases]", 20, height - 20);
}

function keyPressed() {
  if (waveSong && waveSong.isLoaded()) {
    if (key === '1') waveSong.jump(1);    
    if (key === '2') waveSong.jump(121);  
    if (key === '3') waveSong.jump(190); // Salta directo al minuto 3:10 de Fase 2 [1]  
    if (key === '4') waveSong.jump(661);  
    if (key === '5') waveSong.jump(901);  
  }
}

function mousePressed() {
  pressX = mouseX;
  isDragging = true;
  
  // Se removieron las llamadas de estiramiento ("applyThreadPull") de forma definitiva en todas las fases por requerimiento [1]
  grabbedRowIdx = -1;
  grabbedCircleId = -1;
  grabbedCircleRing = -1;
  grabbedLayerIdx = -1;
}

function mouseDragged() {
  if (waveSong && waveSong.isPlaying()) {
    isDragging = true;
    
    // El rate de la canción solo cambia únicamente en la Fase 2 [1]
    let allowedPhase = (currentTime >= 120 && currentTime < 240); 

    if (allowedPhase) {
      let dx = mouseX - pressX;
      // Modulación sutil de velocidad
      targetRate = map(dx, -width / 2, width / 2, 0.85, 1.15);
      targetRate = constrain(targetRate, 0.85, 1.15);
    } else {
      targetRate = 1.0; 
    }
  }
}

function mouseReleased() {
  if (targetRate === 1.0) {
    handleInteraction();
  }
  isDragging = false;
  targetRate = 1.0; 
}

function handleInteraction() {
  userStartAudio();
  if (!waveSong || !waveSong.isLoaded()) return;

  if (!waveSong.isPlaying()) {
    waveSong.play();
  } else {
    // Solo permitimos spawn de ondas reactivas en Fase 1 y 2
    let allowRipples = (currentTime < 240);
    if (allowRipples) {
      spawnRipple(mouseX, mouseY);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}