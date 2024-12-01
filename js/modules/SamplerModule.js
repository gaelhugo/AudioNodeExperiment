import BaseModule from "./BaseModule.js";

export default class SamplerModule extends BaseModule {
  constructor(context, id, x, y) {
    super(context, id, x, y);
    this.title = "Sampler";
    this.type = "sampler";
    this.width = 260;
    this.height = 254;

    // Audio setup
    this.audioNode = this.audioContext.createGain();
    this.buffer = null;
    this.activeNodes = new Map();
    this.baseFrequency = 440; // A4
    this.startPosition = 0;

    // Module connections
    this.inputs = ["trigger"];
    this.outputs = ["audio"];

    // Controls
    this.controls = [
      {
        type: "slider",
        min: 0,
        max: 100,
        value: 0,
        step: 1,
        label: "Start",
        onChange: (value) => {
          this.startPosition = value / 100;
        },
      },
      {
        type: "slider",
        min: 0,
        max: 2,
        value: 1,
        step: 0.01,
        label: "Rate",
        onChange: (value) => (this.playbackRate = value),
      },
      {
        type: "slider",
        min: 0,
        max: 1,
        value: 1,
        step: 0.01,
        label: "Volume",
        onChange: (value) =>
          this.audioNode.gain.setValueAtTime(
            value,
            this.audioContext.currentTime
          ),
      },
    ];
  }

  createDOM() {
    const element = super.createDOM();

    const fileContainer = document.createElement("div");
    fileContainer.className = "sampler-file-container";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "audio/*";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", (e) =>
      this.loadSample(e.target.files[0])
    );

    const loadButton = document.createElement("button");
    loadButton.className = "sampler-load-button";
    loadButton.textContent = "Load Sample";
    loadButton.addEventListener("click", () => fileInput.click());

    this.sampleDisplay = document.createElement("div");
    this.sampleDisplay.className = "sampler-display";
    this.sampleDisplay.textContent = "No sample loaded";

    fileContainer.append(loadButton, fileInput, this.sampleDisplay);
    element.appendChild(fileContainer);

    return element;
  }

  async loadSample(file) {
    try {
      if (!file) {
        throw new Error("No file selected");
      }

      if (!file.type.startsWith("audio/")) {
        throw new Error("Selected file is not an audio file");
      }

      const arrayBuffer = await file.arrayBuffer();
      if (!arrayBuffer) {
        throw new Error("Failed to read file");
      }

      this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sampleDisplay.textContent = file.name;
    } catch (error) {
      console.warn("Error loading sample:", error);
      this.sampleDisplay.textContent = `Error: ${error.message}`;
      this.buffer = null;
    }
  }

  playNote(note, octaveShift = 0) {
    if (!this.buffer || !this.frequencies[note]) return;

    // Always stop any previous instances of this note
    this.stopNote(note);

    // Create and setup source
    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffer;

    // Calculate playback rate with octave shift
    const noteFreq = this.frequencies[note] || 440;
    const octaveAdjustment = Math.pow(2, octaveShift);
    const rate =
      (noteFreq / this.baseFrequency) *
      (this.playbackRate || 1) *
      octaveAdjustment;

    // Ensure rate is a finite number and within reasonable bounds
    const safeRate = Math.max(
      0.1,
      Math.min(4, Number.isFinite(rate) ? rate : 1)
    );
    source.playbackRate.value = safeRate;

    // Create a gain node for this specific instance
    const gainNode = this.audioContext.createGain();
    gainNode.connect(this.audioNode);
    source.connect(gainNode);

    // Calculate start time in seconds
    const startTimeInSeconds = this.buffer.duration * this.startPosition;

    // Start playback from the specified position
    source.start(0, startTimeInSeconds);

    // Store both the source and its gain node
    this.activeNodes.set(note, {
      source: source,
      gain: gainNode,
      startTime: this.audioContext.currentTime,
    });

    // Set up cleanup
    source.onended = () => {
      if (this.activeNodes.has(note)) {
        const node = this.activeNodes.get(note);
        if (node.startTime === this.audioContext.currentTime) {
          node.gain.disconnect();
          this.activeNodes.delete(note);
        }
      }
    };
  }

  stopNote(note) {
    if (this.activeNodes.has(note)) {
      const node = this.activeNodes.get(note);
      try {
        node.source.stop(0);
        node.source.disconnect();
        node.gain.disconnect();
        this.activeNodes.delete(note);
      } catch (e) {
        console.warn("Error stopping note:", e);
      }
    }
  }

  handleInput(type, value, octaveShift = 0) {
    if (type === "trigger") {
      if (value) {
        this.playNote(value, octaveShift);
      } else {
        this.activeNodes.forEach((_, note) => this.stopNote(note));
      }
    }
  }

  connect(destModule) {
    if (destModule.audioNode) {
      this.audioNode.connect(destModule.audioNode);
    }
  }

  disconnect(destModule) {
    if (destModule.audioNode) {
      this.audioNode.disconnect(destModule.audioNode);
    }
  }

  stop() {
    this.activeNodes.forEach((node, note) => {
      try {
        node.source.stop(0);
        node.source.disconnect();
        node.gain.disconnect();
      } catch (e) {
        console.warn("Error stopping note:", e);
      }
    });
    this.activeNodes.clear();
  }

  // Reference frequencies for keyboard control
  frequencies = {
    C: 261.63,
    "C#": 277.18,
    D: 293.66,
    "D#": 311.13,
    E: 329.63,
    F: 349.23,
    "F#": 369.99,
    G: 392.0,
    "G#": 415.3,
    A: 440.0,
    "A#": 466.16,
    B: 493.88,
    C5: 523.25,
  };
}
