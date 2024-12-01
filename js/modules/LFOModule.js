import BaseModule from "./BaseModule.js";

export default class LFOModule extends BaseModule {
  constructor(context, id, x, y) {
    super(context, id, x, y);
    this.type = "lfo";
    this.height = 180;

    // Initialize connectedModules Set
    this.connectedModules = new Set();

    // Create oscillator and gain for LFO
    this.createOscillator();
    this.gainNode = this.audioContext.createGain();

    // Set up outputs
    this.outputs = [{ x: this.width, y: this.height / 2 }];

    // Create controls
    this.controls = [
      {
        type: "select",
        options: ["sine", "square", "sawtooth", "triangle"],
        value: "sine",
        label: "LFO Wave",
        onChange: (value) => {
          if (this.audioNode) {
            this.audioNode.type = value;
          }
        },
      },
      {
        type: "slider",
        min: 0.1,
        max: 20,
        value: 2,
        step: 0.1,
        label: "LFO Rate",
        onChange: (value) => {
          if (this.audioNode && this.audioNode.frequency) {
            this.audioNode.frequency.setValueAtTime(
              value,
              this.audioContext.currentTime
            );
          }
        },
      },
      {
        type: "slider",
        min: 0,
        max: 100,
        value: 50,
        label: "Depth",
        onChange: (value) => {
          if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(
              value,
              this.audioContext.currentTime
            );
          }
        },
      },
    ];

    // Set initial values
    this.gainNode.gain.setValueAtTime(50, this.audioContext.currentTime);
  }

  createOscillator() {
    this.audioNode = this.audioContext.createOscillator();
    this.audioNode.frequency.setValueAtTime(2, this.audioContext.currentTime);

    // Connect to gain node if it exists
    if (this.gainNode) {
      this.audioNode.connect(this.gainNode);
    }
  }

  start() {
    if (!this.isPlaying) {
      this.createOscillator(); // Create new oscillator
      this.audioNode.connect(this.gainNode);
      this.audioNode.start();
      this.isPlaying = true;
      this.reconnectAll();
    }
  }

  stop() {
    if (this.isPlaying) {
      this.audioNode.stop();
      this.audioNode.disconnect();
      this.isPlaying = false;

      // Clear all connections when stopping
      this.connectedModules.forEach((module) => {
        if (
          module.constructor.name === "SoundwaveVisualizerModule" &&
          module.vizGain
        ) {
          try {
            module.vizGain.disconnect();
          } catch (e) {
            console.log("Viz gain already disconnected");
          }
        }
      });
      this.connectedModules.clear();

      // Disconnect gainNode from all destinations
      try {
        this.gainNode.disconnect();
      } catch (e) {
        console.log("Gain node already disconnected");
      }
    }
  }

  connect(module) {
    if (module.constructor.name === "OscillatorModule") {
      if (module.audioNode && module.audioNode.frequency) {
        // Only connect if we're playing
        if (this.isPlaying) {
          // Connect LFO's gain node to the oscillator's frequency
          this.gainNode.connect(module.audioNode.frequency);
        }
        // Store the connection
        this.connectedModules.add(module);
      }
    } else if (module.constructor.name === "SoundwaveVisualizerModule") {
      // For visualizer, connect both the oscillator and gain node
      if (this.isPlaying) {
        // Create a gain node specifically for visualization
        const vizGain = this.audioContext.createGain();
        vizGain.gain.value = 1; // Full amplitude for better visualization

        // Connect oscillator through the viz gain to the analyzer
        this.audioNode.connect(vizGain);
        vizGain.connect(module.audioNode);

        // Store the viz gain node for later cleanup
        module.vizGain = vizGain;
      }
      this.connectedModules.add(module);
    }
  }

  disconnect(module) {
    if (module.constructor.name === "OscillatorModule") {
      try {
        if (module.audioNode && module.audioNode.frequency) {
          // Disconnect LFO's gain node from the oscillator's frequency
          this.gainNode.disconnect(module.audioNode.frequency);
        }
      } catch (e) {
        console.log("Already disconnected");
      }
      this.connectedModules.delete(module);
    } else if (module.constructor.name === "SoundwaveVisualizerModule") {
      try {
        // Disconnect both oscillator and gain connections
        if (module.vizGain) {
          this.audioNode.disconnect(module.vizGain);
          module.vizGain.disconnect(module.audioNode);
        }
      } catch (e) {
        console.log("Already disconnected");
      }
      this.connectedModules.delete(module);
    }
  }

  reconnectAll() {
    if (this.isPlaying) {
      this.connectedModules.forEach((module) => {
        if (module.constructor.name === "OscillatorModule") {
          if (module.audioNode && module.audioNode.frequency) {
            try {
              this.gainNode.connect(module.audioNode.frequency);
            } catch (e) {
              console.log("Failed to reconnect oscillator", e);
            }
          }
        } else if (module.constructor.name === "SoundwaveVisualizerModule") {
          try {
            // Recreate visualization connection
            const vizGain = this.audioContext.createGain();
            vizGain.gain.value = 1;
            this.audioNode.connect(vizGain);
            vizGain.connect(module.audioNode);
            module.vizGain = vizGain;
          } catch (e) {
            console.log("Failed to reconnect visualizer", e);
          }
        }
      });
    }
  }
}
