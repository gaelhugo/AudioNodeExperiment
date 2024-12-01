import BaseModule from "./BaseModule.js";

export default class GainModule extends BaseModule {
  constructor(context, id, x, y) {
    super(context, id, x, y);
    this.type = "gain";
    this.height = 120;

    // Create gain node
    this.audioNode = this.audioContext.createGain();

    // Set up inputs/outputs
    this.inputs = [{ x: 0, y: this.height / 2 }];
    this.outputs = [{ x: this.width, y: this.height / 2 }];

    // Create controls
    this.controls = [
      {
        type: "slider",
        min: 0,
        max: 1,
        value: 0.5,
        step: 0.01,
        label: "Gain",
        onChange: (value) => {
          if (this.audioNode) {
            this.audioNode.gain.setValueAtTime(
              value,
              this.audioContext.currentTime
            );
          }
        },
      },
    ];
  }
}
