import OscillatorModule from "./modules/OscillatorModule.js";
import LFOModule from "./modules/LFOModule.js";
import GainModule from "./modules/GainModule.js";
import DelayModule from "./modules/DelayModule.js";
import ReverbModule from "./modules/ReverbModule.js";
import DestinationModule from "./modules/DestinationModule.js";
import KeyboardModule from "./modules/KeyboardModule.js";
import SoundwaveVisualizerModule from "./modules/SoundwaveVisualizerModule.js";
import SequencerModule from "./modules/SequencerModule.js";
import SlicerModule from "./modules/SlicerModule.js";
import SpectrumVisualizerModule from "./modules/SpectrumVisualizerModule.js";
import ConfigurationManager from "./ConfigurationManager.js";
import SamplerModule from "./modules/SamplerModule.js";
import CustomVisualizerModule from "./modules/CustomVisualizerModule.js";

export default class App {
  constructor() {
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.modules = new Map();
    this.connections = [];
    this.isDragging = false;
    this.selectedNode = null;
    this.wireStart = null;
    this.mousePos = { x: 0, y: 0 };
    this.isPlaying = false;
    this.moduleId = 0;

    this.setupCanvas();
    this.createModules();
    this.setupEventListeners();
    this.createGlobalControls();
    this.animate();
    this.configManager = new ConfigurationManager(this);
  }

  setupCanvas() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "node-canvas";
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.canvas.style.pointerEvents = "all";
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createGlobalControls() {
    const controls = document.createElement("div");
    controls.className = "global-controls";

    this.playButton = document.createElement("button");
    this.playButton.className = "global-play-button";
    this.playButton.textContent = "Play";
    this.playButton.addEventListener("click", () => this.togglePlay());

    controls.appendChild(this.playButton);
    document.body.appendChild(controls);
  }

  createModules() {
    // Left margin from screen edge
    const leftMargin = 50;

    // Vertical spacing between modules
    const verticalSpacing = 220;

    // Row 1: Main signal path
    this.createModule("oscillator", leftMargin, 100);
    this.createModule("gain", leftMargin + 300, 100);
    this.createModule("visualizer", leftMargin + 600, 100);
    this.createModule("destination", leftMargin + 1000, 100);

    // Row 2: Keyboard (due to its larger width)
    this.createModule("keyboard", leftMargin, 100 + verticalSpacing);

    // Row 3: Effects and Modulation
    this.createModule("delay", leftMargin, 100 + verticalSpacing * 2);
    this.createModule("reverb", leftMargin + 300, 100 + verticalSpacing * 2);
    this.createModule("lfo", leftMargin + 600, 100 + verticalSpacing * 2);
    this.createModule("sequencer", leftMargin + 300, 100 + verticalSpacing);
    this.createModule("slicer", leftMargin + 900, 100 + verticalSpacing * 2);
    this.createModule("spectrum", leftMargin + 600, 100 + verticalSpacing);
    this.createModule("sampler", leftMargin + 900, 100 + verticalSpacing * 2);
    this.createModule(
      "customvisualizer",
      leftMargin + 600,
      100 + verticalSpacing * 2
    );
  }

  createModule(type, x, y, existingId = null) {
    const id = existingId || `module-${this.moduleId++}`;
    let module;

    switch (type) {
      case "oscillator":
        module = new OscillatorModule(this.audioContext, id, x, y);
        break;
      case "lfo":
        module = new LFOModule(this.audioContext, id, x, y);
        break;
      case "gain":
        module = new GainModule(this.audioContext, id, x, y);
        break;
      case "delay":
        module = new DelayModule(this.audioContext, id, x, y);
        break;
      case "reverb":
        module = new ReverbModule(this.audioContext, id, x, y);
        break;
      case "destination":
        module = new DestinationModule(this.audioContext, id, x, y);
        break;
      case "keyboard":
        module = new KeyboardModule(this.audioContext, id, x, y);
        break;
      case "visualizer":
        module = new SoundwaveVisualizerModule(this.audioContext, id, x, y);
        break;
      case "sequencer":
        module = new SequencerModule(this.audioContext, id, x, y);
        break;
      case "slicer":
        module = new SlicerModule(this.audioContext, id, x, y);
        break;
      case "spectrum":
        module = new SpectrumVisualizerModule(this.audioContext, id, x, y);
        break;
      case "sampler":
        module = new SamplerModule(this.audioContext, id, x, y);
        break;
      case "customvisualizer":
        module = new CustomVisualizerModule(this.audioContext, id, x, y);
        break;
    }

    if (module) {
      this.modules.set(module.id, module);
      document.body.appendChild(module.createDOM());
      this.makeDraggable(module);
      this.makeConnectable(module);
      return module;
    }

    return null;
  }

  makeDraggable(module) {
    module.dragState = { offsetX: 0, offsetY: 0 };

    module.element.addEventListener("mousedown", (e) => {
      console.log(e.target);
      if (
        e.target === module.element ||
        e.target.className === "module-title"
      ) {
        this.isDragging = true;
        this.selectedNode = module;
        module.dragState.offsetX = e.clientX - module.x;
        module.dragState.offsetY = e.clientY - module.y;
        module.element.classList.add("dragging");
      }
    });
  }

  makeConnectable(module) {
    module.element.querySelectorAll(".connection-point").forEach((point) => {
      point.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        const isOutput = point.classList.contains("output");
        const rect = point.getBoundingClientRect();

        this.wireStart = {
          module: module,
          isOutput: isOutput,
          point: point,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      });
    });
  }

  setupEventListeners() {
    window.addEventListener("mousemove", (e) => {
      this.mousePos = { x: e.clientX, y: e.clientY };

      if (this.isDragging && this.selectedNode) {
        const newX = e.clientX - this.selectedNode.dragState.offsetX;
        const newY = e.clientY - this.selectedNode.dragState.offsetY;

        this.selectedNode.x = newX;
        this.selectedNode.y = newY;
        this.selectedNode.element.style.left = `${newX}px`;
        this.selectedNode.element.style.top = `${newY}px`;
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (this.wireStart) {
        const endPoint = document.elementFromPoint(e.clientX, e.clientY);
        if (endPoint && endPoint.classList.contains("connection-point")) {
          const endModule = this.findModuleById(
            endPoint.closest(".audio-module").id
          );
          if (endModule && this.canConnect(this.wireStart.module, endModule)) {
            this.createConnection(
              this.wireStart.isOutput ? this.wireStart.module : endModule,
              this.wireStart.isOutput ? endModule : this.wireStart.module
            );
          }
        }
        this.wireStart = null;
      }

      if (this.selectedNode) {
        this.selectedNode.element.classList.remove("dragging");
      }

      this.isDragging = false;
      this.selectedNode = null;
    });

    this.canvas.addEventListener("click", (e) => {
      const clickX = e.clientX;
      const clickY = e.clientY;

      // Find the closest wire to the click
      let closestConnection = null;
      let minDistance = Infinity;

      for (const connection of this.connections) {
        const { isNear, distance } = this.isPointNearWire(
          clickX,
          clickY,
          connection
        );
        if (isNear && distance < minDistance) {
          minDistance = distance;
          closestConnection = connection;
        }
      }

      // If we found a close connection, remove it
      if (closestConnection) {
        this.removeConnection(closestConnection);
      }
    });

    window.addEventListener("resize", () => this.resize());
  }

  findModuleById(id) {
    return this.modules.get(id);
  }

  canConnect(fromModule, toModule) {
    // Prevent connecting to self
    if (fromModule === toModule) return false;

    // Prevent connecting outputs to outputs or inputs to inputs
    const fromIsOutput = this.wireStart.isOutput;
    const toIsOutput = !fromIsOutput;
    const endPoint = toModule.element.querySelector(
      `.connection-point.${toIsOutput ? "output" : "input"}`
    );
    if (!endPoint) return false;

    // Check for existing connection
    return !this.connections.some(
      (conn) => conn.from === fromModule.id && conn.to === toModule.id
    );
  }

  createConnection(fromModule, toModule) {
    // Check if connection already exists
    const existingConnection = this.connections.find(
      (conn) => conn.from === fromModule.id && conn.to === toModule.id
    );

    if (existingConnection) {
      return; // Don't create duplicate connections
    }

    const connection = {
      from: fromModule.id,
      to: toModule.id,
      wireCoords: null,
    };

    // Add connection to list
    this.connections.push(connection);

    // Make audio connection if playing
    if (this.isPlaying) {
      if (
        fromModule.constructor.name === "LFOModule" &&
        toModule.constructor.name === "OscillatorModule"
      ) {
        // For LFO connections, always connect regardless of play state
        fromModule.connect(toModule);
      } else {
        fromModule.connect(toModule);
      }
    }

    // Visual feedback
    const outputPoint = fromModule.element.querySelector(
      ".connection-point.output"
    );
    const inputPoint = toModule.element.querySelector(
      ".connection-point.input"
    );
    if (outputPoint) outputPoint.classList.add("connected");
    if (inputPoint) inputPoint.classList.add("connected");
  }

  removeConnection(connection) {
    const fromModule = this.modules.get(connection.from);
    const toModule = this.modules.get(connection.to);

    if (fromModule && toModule) {
      // Remove audio connection
      if (
        fromModule.constructor.name === "LFOModule" &&
        toModule.constructor.name === "OscillatorModule"
      ) {
        // For LFO, disconnect from the frequency parameter
        fromModule.gainNode.disconnect(toModule.audioNode.frequency);
      } else {
        fromModule.disconnect(toModule);
      }

      // Remove visual feedback
      const outputPoint = fromModule.element.querySelector(
        ".connection-point.output"
      );
      const inputPoint = toModule.element.querySelector(
        ".connection-point.input"
      );
      if (outputPoint) outputPoint.classList.remove("connected");
      if (inputPoint) inputPoint.classList.remove("connected");

      // Handle specific module disconnections
      if (
        fromModule.constructor.name === "KeyboardModule" &&
        toModule.constructor.name === "OscillatorModule"
      ) {
        if (toModule.audioNode && toModule.audioNode.frequency) {
          toModule.audioNode.frequency.setValueAtTime(
            0,
            this.audioContext.currentTime
          );
        }
      } else if (
        fromModule.constructor.name === "SequencerModule" &&
        toModule.constructor.name === "KeyboardModule"
      ) {
        toModule.stopAllNotes();
      }
    }

    // Remove from connections array
    this.connections = this.connections.filter(
      (conn) => !(conn.from === connection.from && conn.to === connection.to)
    );
  }

  togglePlay() {
    if (this.isPlaying) {
      this.stopAudio();
    } else {
      this.startAudio();
    }
  }

  startAudio() {
    this.audioContext.resume().then(() => {
      // Start all modules
      this.modules.forEach((module) => {
        module.start();
      });

      // Create all connections
      this.connections.forEach((conn) => {
        const fromModule = this.modules.get(conn.from);
        const toModule = this.modules.get(conn.to);
        if (fromModule && toModule) {
          fromModule.connect(toModule);
        }
      });

      this.isPlaying = true;
      this.playButton.textContent = "Stop";
    });
  }

  stopAudio() {
    // First stop all modules
    this.modules.forEach((module) => {
      // Stop the module
      module.stop();

      // If it's a sequencer, make sure its play button shows "Play"
      if (module.constructor.name === "SequencerModule") {
        const playButton = module.element.querySelector(
          ".sequencer-play-button"
        );
        if (playButton) {
          playButton.textContent = "Play";
        }
        module.isPlaying = false;
      }

      // If it's an LFO, make sure to fully stop it
      if (module.constructor.name === "LFOModule") {
        module.stop();
        module.isPlaying = false;
      }
    });

    // Suspend audio context
    this.audioContext.suspend();
    this.isPlaying = false;
    this.playButton.textContent = "Play";

    // Clear all module states
    this.connections.forEach((conn) => {
      const fromModule = this.modules.get(conn.from);
      const toModule = this.modules.get(conn.to);

      // Handle special cases for stopping
      if (fromModule && toModule) {
        if (fromModule.constructor.name === "KeyboardModule") {
          fromModule.stopAllNotes();
        }
        if (fromModule.constructor.name === "SequencerModule") {
          if (fromModule.stepInterval) {
            clearInterval(fromModule.stepInterval);
          }
        }
      }
    });
  }

  isPointNearWire(x, y, connection) {
    if (!connection.wireCoords) return false;

    const { startX, startY, endX, endY } = connection.wireCoords;

    // Calculate distance from point to line segment
    const A = x - startX;
    const B = y - startY;
    const C = endX - startX;
    const D = endY - startY;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
      xx = startX;
      yy = startY;
    } else if (param > 1) {
      xx = endX;
      yy = endY;
    } else {
      xx = startX + param * C;
      yy = startY + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return {
      isNear: distance < 10, // 10 pixels threshold
      distance: distance,
    };
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw existing connections
    this.connections.forEach((conn) => {
      const fromModule = this.modules.get(conn.from);
      const toModule = this.modules.get(conn.to);

      if (fromModule && toModule) {
        const startPoint = fromModule.element.querySelector(
          ".connection-point.output"
        );
        const endPoint = toModule.element.querySelector(
          ".connection-point.input"
        );

        if (startPoint && endPoint) {
          const startRect = startPoint.getBoundingClientRect();
          const endRect = endPoint.getBoundingClientRect();

          const startX = startRect.left + startRect.width / 2;
          const startY = startRect.top + startRect.height / 2;
          const endX = endRect.left + endRect.width / 2;
          const endY = endRect.top + endRect.height / 2;

          conn.wireCoords = { startX, startY, endX, endY };
          this.drawWire(startX, startY, endX, endY, false, conn);
        }
      }
    });

    // Draw wire being dragged
    if (this.wireStart) {
      this.drawWire(
        this.wireStart.x,
        this.wireStart.y,
        this.mousePos.x,
        this.mousePos.y,
        true
      );
    }

    requestAnimationFrame(() => this.animate());
  }

  drawWire(x1, y1, x2, y2, isTemp = false, connection = null) {
    this.ctx.beginPath();

    // Calculate control points for a smoother curve
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const cp1x = x1 + Math.min(distance * 0.4, 100);
    const cp1y = y1;
    const cp2x = x2 - Math.min(distance * 0.4, 100);
    const cp2y = y2;

    // Draw the wire
    this.ctx.moveTo(x1, y1);
    this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);

    this.ctx.strokeStyle = isTemp ? "#4a9eff" : "#007bff";
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = "rgba(0, 123, 255, 0.4)";
    this.ctx.shadowBlur = 5;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // Draw delete button at the middle of the wire
    if (!isTemp && connection) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      // Check if mouse is near this specific wire
      const { isNear } = this.isPointNearWire(
        this.mousePos.x,
        this.mousePos.y,
        connection
      );

      if (isNear) {
        // Draw delete button
        this.ctx.beginPath();
        this.ctx.arc(midX, midY, 10, 0, Math.PI * 2);
        this.ctx.fillStyle = "#ff4757";
        this.ctx.fill();

        // Draw X
        this.ctx.beginPath();
        this.ctx.moveTo(midX - 4, midY - 4);
        this.ctx.lineTo(midX + 4, midY + 4);
        this.ctx.moveTo(midX + 4, midY - 4);
        this.ctx.lineTo(midX - 4, midY + 4);
        this.ctx.strokeStyle = "white";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    }
  }
}
