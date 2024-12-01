import BaseModule from "./BaseModule.js";

export default class SoundwaveVisualizerModule extends BaseModule {
  constructor(audioContext, id, x, y) {
    super(audioContext, id, x, y);
    this.title = "Visualizer";
    this.inputs = ["audio"];
    this.outputs = ["audio"];
    this.width = 300;

    // Create analyzer node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);

    // Set this as the main audio node
    this.audioNode = this.analyser;

    // Canvas context for visualization
    this.canvasCtx = null;
    this.animationId = null;
    this.isPlaying = false;
  }

  createDOM() {
    const element = document.createElement("div");
    element.className = "audio-module module-visualizer";
    element.id = this.id;
    element.style.left = `${this.x}px`;
    element.style.top = `${this.y}px`;

    // Add title
    const title = document.createElement("div");
    title.className = "module-title";
    title.textContent = this.title;
    element.appendChild(title);

    // Add canvas for visualization
    const canvas = document.createElement("canvas");
    canvas.className = "visualizer-canvas";
    canvas.width = this.width - 20;
    canvas.height = 100;
    element.appendChild(canvas);

    // Add connection points
    const connectionPoints = document.createElement("div");
    connectionPoints.className = "connection-points";

    // Input point
    const inputPoint = document.createElement("div");
    inputPoint.className = "connection-point input";
    inputPoint.style.top = "50%";
    connectionPoints.appendChild(inputPoint);

    // Output point (to pass through the signal)
    const outputPoint = document.createElement("div");
    outputPoint.className = "connection-point output";
    outputPoint.style.top = "50%";
    connectionPoints.appendChild(outputPoint);

    element.appendChild(connectionPoints);

    this.element = element;
    this.canvasCtx = canvas.getContext("2d");
    return element;
  }

  connect(module) {
    if (module.audioNode) {
      module.audioNode.connect(this.analyser);
    }
  }

  disconnect(module) {
    if (module.audioNode) {
      module.audioNode.disconnect(this.analyser);
    }
  }

  start() {
    this.isPlaying = true;
    this.draw();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    // Clear canvas
    if (this.canvasCtx) {
      const canvas = this.canvasCtx.canvas;
      this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  draw() {
    if (!this.isPlaying) return;

    this.animationId = requestAnimationFrame(() => this.draw());

    this.analyser.getByteTimeDomainData(this.dataArray);

    const canvas = this.canvasCtx.canvas;
    this.canvasCtx.fillStyle = "#2d3436";
    this.canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    this.canvasCtx.lineWidth = 2;
    this.canvasCtx.strokeStyle = "#74b9ff";
    this.canvasCtx.beginPath();

    const sliceWidth = canvas.width / this.bufferLength;
    let x = 0;

    for (let i = 0; i < this.bufferLength; i++) {
      const v = this.dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        this.canvasCtx.moveTo(x, y);
      } else {
        this.canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.canvasCtx.lineTo(canvas.width, canvas.height / 2);
    this.canvasCtx.stroke();
  }
}
