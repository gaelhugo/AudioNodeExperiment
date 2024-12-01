import BaseModule from "./BaseModule.js";

export default class CustomVisualizerModule extends BaseModule {
  constructor(context, id, x, y) {
    super(context, id, x, y);
    this.title = "Custom Visualizer";
    this.type = "customvisualizer";
    this.width = 400;
    this.height = 400;

    // Create analyzer node
    this.audioNode = this.audioContext.createAnalyser();
    this.audioNode.fftSize = 512;
    this.bufferLength = this.audioNode.frequencyBinCount;
    // this.dataArray = new Uint8Array(this.bufferLength);
    this.dataFrequency = new Uint8Array(this.bufferLength);
    this.dataFloatFrequency = new Float32Array(this.bufferLength);
    this.dataWave = new Uint8Array(this.bufferLength);

    this.inputs = ["audio"];
    this.outputs = [];

    // Animation state
    this.isAnimating = false;
    this.canvas = null;
    this.ctx = null;
    this.currentCode = this.getDefaultCode();
    this.userDrawFunction = null;
  }

  getDefaultCode() {
    return `// Available variables:
// ctx - Canvas 2D context
// width, height - Canvas dimensions
// dataWave - Uint8Array with frequency data
// bufferLength - Length of dataWave
// time - Current time in seconds
// deltaTime - Time since last frame in seconds

// Example: Draw frequency bars
ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
ctx.fillRect(0, 0, width, height);

const barWidth = width / bufferLength * 3;
const heightScale = height / 256;

ctx.fillStyle = \`hsl(\${time * 50 % 360}, 70%, 60%)\`;

for (let i = 0; i < bufferLength; i++) {
  const value = dataWave[i];
  const x = i * barWidth;
  const barHeight = value * heightScale;
  
  ctx.fillRect(
    x, 
    height - barHeight, 
    barWidth - 1, 
    barHeight
  );
}`;
  }

  createDOM() {
    const element = super.createDOM();

    // Create container for canvas and controls
    const container = document.createElement("div");
    container.className = "custom-visualizer-container";

    // Create code editor
    const editorContainer = document.createElement("div");
    editorContainer.className = "code-editor-container";

    const editor = document.createElement("textarea");
    editor.className = "code-editor";
    editor.value = this.currentCode;
    editor.spellcheck = false;

    // Create control buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "editor-controls";

    const runButton = document.createElement("button");
    runButton.textContent = "Run Code";
    runButton.className = "run-button";
    runButton.addEventListener("click", () =>
      this.updateVisualization(editor.value)
    );

    const resetButton = document.createElement("button");
    resetButton.textContent = "Reset";
    resetButton.className = "reset-button";
    resetButton.addEventListener("click", () => {
      editor.value = this.getDefaultCode();
      this.updateVisualization(editor.value);
    });

    buttonContainer.appendChild(runButton);
    buttonContainer.appendChild(resetButton);
    editorContainer.appendChild(editor);
    editorContainer.appendChild(buttonContainer);

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.className = "custom-visualizer-canvas";
    this.canvas.width = 300;
    this.canvas.height = 150;
    this.ctx = this.canvas.getContext("2d");

    container.appendChild(this.canvas);
    container.appendChild(editorContainer);
    element.appendChild(container);

    // Start with default visualization
    this.updateVisualization(this.currentCode);
    this.startAnimation();

    return element;
  }

  updateVisualization(code) {
    try {
      // Create a function from the code
      this.userDrawFunction = new Function(
        "ctx",
        "width",
        "height",
        "dataWave",
        "dataFrequency",
        "dataFloatFrequency",
        "bufferLength",
        "time",
        "deltaTime",
        code
      );
      this.currentCode = code;
    } catch (error) {
      console.error("Error in visualization code:", error);
      // You could add error display in the UI here
    }
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
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;
    const time = currentTime / 1000; // Convert to seconds

    // Get frequency data
    this.audioNode.getByteFrequencyData(this.dataFrequency);
    this.audioNode.getByteTimeDomainData(this.dataWave);
    this.audioNode.getFloatFrequencyData(this.dataFloatFrequency);

    try {
      if (this.userDrawFunction) {
        this.userDrawFunction(
          this.ctx,
          this.canvas.width,
          this.canvas.height,
          this.dataWave,
          this.dataFrequency,
          this.dataFloatFrequency,
          this.bufferLength,
          time,
          deltaTime
        );
      }
    } catch (error) {
      console.error("Error in visualization execution:", error);
    }
  }

  start() {
    this.startAnimation();
  }

  stop() {
    this.stopAnimation();
  }
}
