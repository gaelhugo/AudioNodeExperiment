import BaseModule from "./BaseModule.js";

export default class OscillatorModule extends BaseModule {
  constructor(context, id, x, y) {
    super(context, id, x, y);
    this.type = "oscillator";
    this.height = 120;

    // Create oscillator
    this.audioNode = this.audioContext.createOscillator();

    // Set up inputs/outputs
    this.outputs = [{ x: this.width, y: this.height / 2 }];
    this.inputs = [{ x: 0, y: this.height / 2 }];

    // Create controls
    this.controls = [
      {
        type: "select",
        options: ["sine", "square", "sawtooth", "triangle"],
        value: "sine",
        label: "Wave",
        onChange: (value) => {
          if (this.audioNode) {
            this.audioNode.type = value;
          }
        },
      },
      {
        type: "slider",
        min: 20,
        max: 2000,
        value: 440,
        label: "Frequency",
        onChange: (value) => {
          if (this.audioNode && this.audioNode.frequency) {
            this.audioNode.frequency.setValueAtTime(
              value,
              this.audioContext.currentTime
            );
          }
        },
      },
    ];
  }

  start() {
    if (this.audioNode) {
      this.audioNode.start();
      this.isPlaying = true;
    }
  }

  stop() {
    if (this.audioNode && this.isPlaying) {
      this.audioNode.stop();
      this.isPlaying = false;
      // Create new oscillator since stopped ones can't be restarted
      const newOsc = this.audioContext.createOscillator();
      newOsc.type = this.audioNode.type;
      newOsc.frequency.value = this.audioNode.frequency.value;
      this.audioNode = newOsc;
    }
  }
}
