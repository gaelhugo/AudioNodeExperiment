import BaseModule from "./BaseModule.js";

export default class SpectrumVisualizerModule extends BaseModule {
  constructor(context, id, x, y) {
    super(context, id, x, y);
    this.title = "Spectrum";
    this.type = "spectrum";
    this.width = 260;
    this.height = 200;

    // Create analyzer node with optimized settings for more reactivity
    this.audioNode = this.audioContext.createAnalyser();
    this.audioNode.fftSize = 1024; // Smaller FFT size for faster response
    this.audioNode.smoothingTimeConstant = 0.5; // Lower smoothing for more immediate response
    this.audioNode.minDecibels = -70; // Higher min value for better sensitivity
    this.audioNode.maxDecibels = -10;

    this.bufferLength = this.audioNode.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);

    this.inputs = ["audio"];
    this.outputs = [];

    // Animation
    this.isAnimating = false;
    this.hue = 180;
    this.canvas = null;
    this.ctx = null;
    this.lastTime = 0;
    this.peaks = new Array(this.bufferLength).fill(0);
    this.peakDecay = 0.85; // Faster peak decay for more dynamic movement

    // Add fullscreen change listener
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        this.canvas.style.position = "";
        this.canvas.style.top = "";
        this.canvas.style.left = "";
        this.canvas.style.transform = "";
        this.canvas.width = 240;
        this.canvas.height = 140;
        this.canvas.classList.remove("fullscreen");

        // Ensure the canvas stays in the spectrum container
        const container = this.element.querySelector(".spectrum-container");
        if (container && this.canvas.parentElement !== container) {
          container.appendChild(this.canvas);
        }
      }
    });

    // Add resize handler for fullscreen
    window.addEventListener("resize", () => {
      if (document.fullscreenElement) {
        const originalRatio = 240 / 140;
        const screenRatio = window.innerWidth / window.innerHeight;

        let newWidth, newHeight;
        if (screenRatio > originalRatio) {
          newHeight = window.innerHeight;
          newWidth = newHeight * originalRatio;
        } else {
          newWidth = window.innerWidth;
          newHeight = newWidth / originalRatio;
        }

        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
      }
    });
  }

  createDOM() {
    const element = super.createDOM();

    // Create container for canvas and controls
    const container = document.createElement("div");
    container.className = "spectrum-container";

    // Create fullscreen button
    const fullscreenButton = document.createElement("button");
    fullscreenButton.className = "spectrum-fullscreen-button";
    fullscreenButton.textContent = "⛶"; // Unicode fullscreen symbol
    fullscreenButton.addEventListener("click", () => this.toggleFullscreen());

    this.canvas = document.createElement("canvas");
    this.canvas.className = "spectrum-canvas";
    this.canvas.width = 240;
    this.canvas.height = 140;
    this.ctx = this.canvas.getContext("2d");

    container.appendChild(this.canvas);
    container.appendChild(fullscreenButton);
    element.appendChild(container);

    this.startAnimation();

    return element;
  }

  startAnimation() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.lastTime = performance.now();
      this.animate();
    }
  }

  stopAnimation() {
    this.isAnimating = false;
  }

  animate() {
    if (!this.isAnimating) return;

    requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    const timeScale = currentTime * 0.001;

    // Get frequency data with higher resolution
    this.audioNode.getByteFrequencyData(this.dataArray);

    // Calculate scale factor
    const isFullscreen = !!document.fullscreenElement;
    const scaleFactor = isFullscreen
      ? Math.min(window.innerWidth / 240, window.innerHeight / 140)
      : 1;

    // Pre-calculate common values
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.45;
    const barCount = Math.floor(this.bufferLength / 4); // Increase bar count for more detail

    // Calculate average and peak frequencies for global effects
    let avgFreq = 0;
    let bassEnergy = 0;
    let midEnergy = 0;
    let trebleEnergy = 0;

    // More precise frequency band separation
    const bassRange = Math.floor(barCount * 0.2); // First 20% for bass
    const midRange = Math.floor(barCount * 0.5); // Next 30% for mids
    const trebleRange = barCount; // Remaining 50% for treble

    for (let i = 0; i < barCount; i++) {
      const value = this.dataArray[i];
      const normalizedValue = value / 256;
      const weightedValue = Math.pow(normalizedValue, 1.5); // Emphasize stronger frequencies

      if (i < bassRange) {
        bassEnergy += weightedValue * 1.5; // Boost bass response
      } else if (i < midRange) {
        midEnergy += weightedValue * 1.2; // Slight boost to mids
      } else {
        trebleEnergy += weightedValue;
      }
      avgFreq += weightedValue;
    }

    // Normalize the energy values with boosted sensitivity
    bassEnergy = Math.pow(bassEnergy / bassRange, 0.8);
    midEnergy = Math.pow(midEnergy / (midRange - bassRange), 0.8);
    trebleEnergy = Math.pow(trebleEnergy / (trebleRange - midRange), 0.8);
    const avgEnergy = Math.pow(avgFreq / barCount, 0.8);

    // Dynamic spiral parameters based on audio
    const spiralTightness = 1.2 + Math.sin(timeScale) * 0.2 * bassEnergy;
    const angleStep = ((Math.PI * 2) / barCount) * (2 + trebleEnergy);

    // Clear and draw background with reactive gradient
    this.ctx.clearRect(0, 0, width, height);

    // Draw circular grid with dynamic opacity
    this.ctx.globalAlpha = 0.03 + avgEnergy * 0.02;
    this.drawGrid(centerX, centerY, maxRadius, timeScale, bassEnergy);
    this.ctx.globalAlpha = 1;

    // Draw dynamic background gradient
    const bgGradient = this.ctx.createRadialGradient(
      centerX + Math.sin(timeScale * 2) * 50 * bassEnergy,
      centerY + Math.cos(timeScale * 3) * 50 * trebleEnergy,
      0,
      centerX,
      centerY,
      maxRadius * (2 + avgEnergy * 0.5)
    );

    // Dynamic background colors based on frequency ranges
    const hueShift = Math.sin(timeScale * 2) * 30 + avgEnergy * 60;
    const bassSaturation = 40 + bassEnergy * 40;
    const trebleBrightness = 5 + trebleEnergy * 15;

    bgGradient.addColorStop(
      0,
      `hsla(${
        this.hue + hueShift
      }, ${bassSaturation}%, ${trebleBrightness}%, 0.95)`
    );
    bgGradient.addColorStop(
      0.5,
      `hsla(${this.hue + hueShift + 30}, ${bassSaturation * 0.8}%, ${
        trebleBrightness * 1.5
      }%, 0.95)`
    );
    bgGradient.addColorStop(
      1,
      `hsla(${this.hue + hueShift - 30}, ${bassSaturation * 0.6}%, ${
        trebleBrightness * 0.8
      }%, 0.98)`
    );

    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, width, height);

    // Draw dynamic lines
    this.ctx.globalAlpha = 0.1 + bassEnergy * 0.1;
    this.drawDynamicLines(
      centerX,
      centerY,
      maxRadius,
      timeScale,
      bassEnergy,
      trebleEnergy
    );
    this.ctx.globalAlpha = 1;

    // Draw subtle grid with reactive opacity
    if (!isFullscreen) {
      this.ctx.globalAlpha = 0.05 + avgEnergy * 0.05;
      this.drawGrid();
      this.ctx.globalAlpha = 1;
    }

    // Draw connecting lines
    this.drawConnectingLines(
      centerX,
      centerY,
      maxRadius * 0.8, // Slightly smaller radius for connecting lines
      timeScale,
      bassEnergy,
      trebleEnergy
    );

    // Create off-screen canvas for bars
    const barCanvas = document.createElement("canvas");
    barCanvas.width = width;
    barCanvas.height = height;
    const barCtx = barCanvas.getContext("2d");

    // Draw bars with enhanced effects
    for (let i = 0; i < barCount; i++) {
      const index = Math.floor(Math.pow(i / barCount, 1.5) * this.bufferLength);
      const value = this.dataArray[index];
      const percent = value / 256;

      // Calculate position with dynamic spiral
      const angle = i * angleStep + (this.hue * Math.PI) / 180;
      const radiusOffset = Math.sin(i * 0.1 + timeScale * 3) * 30 * bassEnergy;
      const radius =
        ((i / barCount) * maxRadius * spiralTightness + radiusOffset) *
        (1 + avgEnergy * 0.2);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Dynamic height calculation with multiple influences
      const baseHeight = Math.max(4 * scaleFactor, 150 * percent * scaleFactor);
      const pulseHeight =
        baseHeight *
        (1 + Math.sin(timeScale * 4 + i * 0.2) * 0.4 * trebleEnergy);
      const reactiveHeight = pulseHeight * (1 + avgEnergy * 0.5);
      const height = reactiveHeight * (1 + (i / barCount) * bassEnergy * 0.5);

      // Enhanced color calculation
      const freqFactor = i / barCount;
      const hue =
        (this.hue + freqFactor * 360 + Math.sin(timeScale * 2 + i * 0.1) * 30) %
        360;
      const saturation =
        70 + percent * 30 + Math.sin(timeScale * 3) * 20 * trebleEnergy;
      const lightness =
        50 + avgEnergy * 40 + (freqFactor < 0.33 ? bassEnergy * 30 : 0);
      const alpha = 0.3 + percent * 0.7 + bassEnergy * 0.5;

      // Draw bar with enhanced effects
      barCtx.save();
      barCtx.translate(x, y);
      barCtx.rotate(
        angle + Math.PI / 2 + Math.sin(timeScale + i * 0.1) * 0.1 * bassEnergy
      );

      // Create more complex gradient
      const gradient = barCtx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(
        0,
        `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`
      );
      gradient.addColorStop(
        0.5,
        `hsla(${hue + 30}, ${saturation * 0.9}%, ${lightness * 0.8}%, ${
          alpha * 0.9
        })`
      );
      gradient.addColorStop(
        1,
        `hsla(${hue - 30}, ${saturation * 0.8}%, ${lightness * 0.6}%, ${
          alpha * 0.8
        })`
      );

      // Dynamic bar width based on frequency
      const barWidth =
        (4 + Math.sin(timeScale * 2 + i * 0.2) * 2 * avgEnergy) * scaleFactor;
      barCtx.beginPath();
      this.roundedRect(-barWidth / 2, 0, barWidth, height, barWidth / 2);
      barCtx.fillStyle = gradient;

      // Enhanced glow effect
      if (percent > 0.1) {
        const glowIntensity = Math.min(1, percent * 3 + avgEnergy);
        barCtx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, ${glowIntensity})`;
        barCtx.shadowBlur = (15 + avgEnergy * 20) * scaleFactor;
      }

      barCtx.fill();
      barCtx.restore();

      // Update peaks with enhanced behavior
      const peakDecay = this.peakDecay - bassEnergy * 0.1;
      this.peaks[i] = Math.max(height, (this.peaks[i] || 0) * peakDecay);
      if (this.peaks[i] > height) {
        barCtx.save();
        barCtx.translate(x, y);
        barCtx.rotate(angle + Math.PI / 2);

        const peakSize = (5 + avgEnergy * 4) * scaleFactor;
        const peakGradient = barCtx.createRadialGradient(
          0,
          this.peaks[i],
          0,
          0,
          this.peaks[i],
          peakSize
        );
        peakGradient.addColorStop(
          0,
          `hsla(${hue}, ${saturation}%, ${lightness + 20}%, ${1 + avgEnergy})`
        );
        peakGradient.addColorStop(
          1,
          `hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0)`
        );

        barCtx.fillStyle = peakGradient;
        barCtx.beginPath();
        barCtx.arc(0, this.peaks[i], peakSize, 0, Math.PI * 2);
        barCtx.fill();
        barCtx.restore();
      }
    }

    // Draw the final result
    this.ctx.drawImage(barCanvas, 0, 0);

    // Update hue with dynamic speed based on audio
    this.hue =
      (this.hue + deltaTime * (0.02 + avgEnergy * 0.1 + bassEnergy * 0.2)) %
      360;
  }

  drawGrid(centerX, centerY, maxRadius, timeScale, bassAvg) {
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.lineWidth = 1;

    // Draw circular grid lines with dynamic radius
    const numCircles = 8;
    for (let i = 1; i <= numCircles; i++) {
      const radius =
        (maxRadius / numCircles) *
        i *
        (1 + Math.sin(timeScale + i * 0.2) * 0.02 * bassAvg);
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Draw radial lines with dynamic rotation
    const numLines = 16;
    const baseRotation = timeScale * 0.1;
    for (let i = 0; i < numLines; i++) {
      const angle = (i * Math.PI * 2) / numLines + baseRotation;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      const lineLength =
        maxRadius * (1 + Math.sin(timeScale * 2 + i * 0.3) * 0.05 * bassAvg);
      this.ctx.lineTo(
        centerX + Math.cos(angle) * lineLength,
        centerY + Math.sin(angle) * lineLength
      );
      this.ctx.stroke();
    }
  }

  drawDynamicLines(centerX, centerY, maxRadius, timeScale, bassAvg, trebleAvg) {
    const numLines = 5;
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.lineWidth = 2;

    for (let i = 0; i < numLines; i++) {
      const angle =
        (timeScale * 0.5 + (i * Math.PI * 2) / numLines) % (Math.PI * 2);
      const length =
        maxRadius * (1.2 + Math.sin(timeScale + i) * 0.3 * bassAvg);
      const wave = Math.sin(timeScale * 2 + i * 0.5) * 50 * trebleAvg;

      this.ctx.beginPath();
      this.ctx.moveTo(
        centerX + Math.cos(angle) * (maxRadius * 0.2),
        centerY + Math.sin(angle) * (maxRadius * 0.2)
      );

      // Create a wavy line
      const points = 20;
      for (let j = 0; j <= points; j++) {
        const t = j / points;
        const radius = maxRadius * 0.2 + length * t;
        const waveOffset = wave * Math.sin(t * Math.PI * 2 + timeScale * 3);

        const x =
          centerX +
          Math.cos(angle) * radius +
          Math.cos(angle + Math.PI / 2) * waveOffset;
        const y =
          centerY +
          Math.sin(angle) * radius +
          Math.sin(angle + Math.PI / 2) * waveOffset;

        if (j === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }

      this.ctx.stroke();
    }
  }

  roundedRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height
    );
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  start() {
    this.startAnimation();
  }

  stop() {
    this.stopAnimation();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      this.canvas.requestFullscreen().then(() => {
        // Calculate new dimensions while maintaining aspect ratio
        const originalRatio = 240 / 140;
        const screenRatio = window.innerWidth / window.innerHeight;

        let newWidth, newHeight;
        if (screenRatio > originalRatio) {
          newHeight = window.innerHeight;
          newWidth = newHeight * originalRatio;
        } else {
          newWidth = window.innerWidth;
          newHeight = newWidth / originalRatio;
        }

        // Center the canvas in fullscreen
        this.canvas.style.position = "fixed";
        this.canvas.style.top = "50%";
        this.canvas.style.left = "50%";
        this.canvas.style.transform = "translate(-50%, -50%)";

        // Set new dimensions
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        this.canvas.classList.add("fullscreen");
      });
    } else {
      // Exit fullscreen
      document.exitFullscreen().then(() => {
        // Reset to original dimensions and positioning
        this.canvas.style.position = "";
        this.canvas.style.top = "";
        this.canvas.style.left = "";
        this.canvas.style.transform = "";
        this.canvas.width = 240;
        this.canvas.height = 140;
        this.canvas.classList.remove("fullscreen");

        // Ensure the canvas stays in the spectrum container
        const container = this.element.querySelector(".spectrum-container");
        if (container && this.canvas.parentElement !== container) {
          container.appendChild(this.canvas);
        }
      });
    }
  }

  drawConnectingLines(
    centerX,
    centerY,
    maxRadius,
    timeScale,
    bassAvg,
    trebleAvg
  ) {
    const numLines = Math.floor(this.bufferLength / 12); // Fewer lines for better quality

    // Calculate overall audio reactivity with more emphasis on bass
    let totalEnergy = 0;
    let bassEnergy = 0;
    let midEnergy = 0;
    let trebleEnergy = 0;

    for (let i = 0; i < numLines; i++) {
      const value = this.dataArray[i] / 256;
      totalEnergy += value;

      if (i < numLines * 0.33) {
        bassEnergy += value;
      } else if (i < numLines * 0.66) {
        midEnergy += value;
      } else {
        trebleEnergy += value;
      }
    }

    bassEnergy = bassEnergy / (numLines * 0.33);
    midEnergy = midEnergy / (numLines * 0.33);
    trebleEnergy = trebleEnergy / (numLines * 0.33);
    const avgEnergy = totalEnergy / numLines;

    // Enhanced center point reactivity
    const centerPulse = 1 + avgEnergy * 1.2;
    const reactiveRadius = (20 + bassEnergy * 40) * centerPulse;

    // Draw reactive center point with enhanced gradient
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, reactiveRadius, 0, Math.PI * 2);
    const centerGradient = this.ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      reactiveRadius * 2
    );

    const centerHue = (this.hue + Math.sin(timeScale * 2) * 60) % 360;
    centerGradient.addColorStop(
      0,
      `hsla(${centerHue}, 80%, 60%, ${avgEnergy + 0.3})`
    );
    centerGradient.addColorStop(
      0.5,
      `hsla(${centerHue + 30}, 70%, 50%, ${avgEnergy * 0.9})`
    );
    centerGradient.addColorStop(1, "transparent");

    this.ctx.fillStyle = centerGradient;
    this.ctx.fill();

    // Draw dynamic rings with wave effect
    const numRings = 4;
    for (let i = 0; i < numRings; i++) {
      const ringRadius =
        reactiveRadius *
        (1.5 + i * 0.5) *
        (1 + Math.sin(timeScale * 2 + i) * 0.3 * bassEnergy);

      this.ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
        const waveOffset =
          Math.sin(angle * 8 + timeScale * 3) * 10 * trebleEnergy;
        const x = centerX + Math.cos(angle) * (ringRadius + waveOffset);
        const y = centerY + Math.sin(angle) * (ringRadius + waveOffset);

        if (angle === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.strokeStyle = `hsla(${centerHue}, 70%, 60%, ${
        (avgEnergy * 0.3) / (i + 1)
      })`;
      this.ctx.lineWidth = 2 + bassEnergy * 3;
      this.ctx.stroke();
    }

    // Draw connecting lines with enhanced 3D effect
    for (let i = 0; i < numLines; i++) {
      const value = this.dataArray[i];
      const percent = value / 256;
      const freqIndex = Math.floor((i / numLines) * this.bufferLength);
      const freqValue = this.dataArray[freqIndex];
      const freqPercent = freqValue / 256;

      // Dynamic angle calculation with more fluid movement
      const baseAngle = (i * Math.PI * 2) / numLines;
      const angleOffset =
        Math.sin(timeScale * 0.5 + i * 0.1) * 0.2 * bassEnergy;
      const angle =
        baseAngle + timeScale * (0.1 + bassEnergy * 0.4) + angleOffset;

      // Enhanced radius calculation with 3D-like movement
      const radiusBase = maxRadius * (0.8 + freqPercent * 0.4);
      const radiusOffset = Math.sin(timeScale * 2 + i * 0.2) * 50 * bassEnergy;
      const radius = radiusBase + radiusOffset;

      // Calculate end point with enhanced reactivity
      const x = centerX + Math.cos(angle) * radius * (1 + percent * 0.3);
      const y = centerY + Math.sin(angle) * radius * (1 + percent * 0.3);

      // Create more complex curve with multiple control points
      const points = [];
      const numPoints = 8; // More points for smoother curve
      for (let j = 0; j <= numPoints; j++) {
        const t = j / numPoints;
        const dist = radius * t;

        // Add multiple wave effects
        const baseWave =
          Math.sin(timeScale * 3 + i + t * Math.PI * 2) * 30 * trebleEnergy;
        const secondWave =
          Math.cos(timeScale * 2 + i * 0.5 + t * Math.PI * 4) * 20 * midEnergy;
        const thirdWave =
          Math.sin(timeScale * 4 + i * 0.3 + t * Math.PI * 6) * 15 * bassEnergy;
        const totalWave = (baseWave + secondWave + thirdWave) * t;

        const px =
          centerX +
          Math.cos(angle) * dist +
          Math.cos(angle + Math.PI / 2) * totalWave;
        const py =
          centerY +
          Math.sin(angle) * dist +
          Math.sin(angle + Math.PI / 2) * totalWave;
        points.push({ x: px, y: py });
      }

      // Draw the enhanced curve
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);

      // Create smooth curve through points with tension
      for (let j = 0; j < points.length - 1; j++) {
        const xc = (points[j].x + points[j + 1].x) / 2;
        const yc = (points[j].y + points[j + 1].y) / 2;
        this.ctx.quadraticCurveTo(
          points[j].x + Math.sin(timeScale + i) * 10 * bassEnergy,
          points[j].y + Math.cos(timeScale + i) * 10 * bassEnergy,
          xc,
          yc
        );
      }

      // Enhanced gradient with more color variation
      const gradient = this.ctx.createLinearGradient(centerX, centerY, x, y);
      const hue = (this.hue + (i / numLines) * 360 + freqPercent * 120) % 360;
      const saturation = 70 + percent * 30;
      const lightness = 50 + avgEnergy * 30;
      const alpha = 0.3 + percent * 0.5 + bassEnergy * 0.4;

      gradient.addColorStop(
        0,
        `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`
      );
      gradient.addColorStop(
        0.5,
        `hsla(${hue + 60}, ${saturation}%, ${lightness + 10}%, ${alpha * 0.8})`
      );
      gradient.addColorStop(
        1,
        `hsla(${hue + 120}, ${saturation}%, ${lightness}%, ${alpha * 0.6})`
      );

      // Enhanced line width with more variation
      this.ctx.lineWidth = (3 + percent * 5 + avgEnergy * 4) * (1 + bassEnergy);
      this.ctx.strokeStyle = gradient;

      // Enhanced glow effect
      if (percent > 0.1) {
        const glowIntensity = Math.min(1, percent * 2 + avgEnergy);
        this.ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, ${glowIntensity})`;
        this.ctx.shadowBlur = 20 * (1 + avgEnergy + bassEnergy);
      }

      this.ctx.stroke();
      this.ctx.shadowBlur = 0;

      // Add enhanced connecting nodes
      points.forEach((point, j) => {
        if (percent > 0.15) {
          const nodeSize =
            (4 + percent * 4) * (1 + Math.sin(timeScale * 3 + i + j) * 0.5);
          const nodeBrightness = lightness + Math.sin(timeScale * 2 + j) * 20;

          this.ctx.beginPath();
          this.ctx.arc(point.x, point.y, nodeSize, 0, Math.PI * 2);
          this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${nodeBrightness}%, ${
            alpha * 1.2
          })`;
          this.ctx.fill();
        }
      });
    }
  }
}
