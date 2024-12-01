import BaseModule from "./BaseModule.js";

export default class ReverbModule extends BaseModule {
  constructor(context, id, x, y) {
    super(context, id, x, y);
    this.type = "reverb";
    this.height = 120;

    // Create convolver node
    this.audioNode = this.audioContext.createConvolver();

    // Create impulse response
    this.createImpulseResponse(2);

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
        label: "Mix",
        onChange: (value) => {
          if (this.wetGain && this.dryGain) {
            this.wetGain.gain.setValueAtTime(
              value,
              this.audioContext.currentTime
            );
            this.dryGain.gain.setValueAtTime(
              1 - value,
              this.audioContext.currentTime
            );
          }
        },
      },
      {
        type: "slider",
        min: 0.1,
        max: 5,
        value: 2,
        step: 0.1,
        label: "Decay",
        onChange: (value) => this.createImpulseResponse(value),
      },
    ];
  }

  createImpulseResponse(duration) {
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] =
          (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.1));
      }
    }

    this.audioNode.buffer = impulse;
  }
}
