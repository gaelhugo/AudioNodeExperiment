import BaseModule from "./BaseModule.js";

export default class DelayModule extends BaseModule {
  constructor(context, id, x, y) {
    super(context, id, x, y);
    this.type = "delay";
    this.height = 180;

    // Create nodes
    this.delayNode = this.audioContext.createDelay(5.0);
    this.feedbackNode = this.audioContext.createGain();
    this.wetGain = this.audioContext.createGain();
    this.dryGain = this.audioContext.createGain();

    // Set initial values
    this.delayNode.delayTime.setValueAtTime(0.3, this.audioContext.currentTime);
    this.feedbackNode.gain.setValueAtTime(0.7, this.audioContext.currentTime);
    this.wetGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    this.dryGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);

    // Create internal connections
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
    this.delayNode.connect(this.wetGain);

    // Main node for external connections
    this.audioNode = this.delayNode;

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
          this.wetGain.gain.setValueAtTime(
            value,
            this.audioContext.currentTime
          );
          this.dryGain.gain.setValueAtTime(
            1 - value,
            this.audioContext.currentTime
          );
        },
      },
      {
        type: "slider",
        min: 0.01,
        max: 2,
        value: 0.3,
        step: 0.01,
        label: "Time",
        onChange: (value) => {
          this.delayNode.delayTime.setValueAtTime(
            value,
            this.audioContext.currentTime
          );
        },
      },
      {
        type: "slider",
        min: 0,
        max: 0.95,
        value: 0.7,
        step: 0.01,
        label: "Feedback",
        onChange: (value) => {
          this.feedbackNode.gain.setValueAtTime(
            value,
            this.audioContext.currentTime
          );
        },
      },
    ];
  }

  connect(destModule) {
    if (destModule.audioNode) {
      this.wetGain.connect(destModule.audioNode);
      this.dryGain.connect(destModule.audioNode);
    }
  }

  disconnect(destModule) {
    if (destModule.audioNode) {
      this.wetGain.disconnect(destModule.audioNode);
      this.dryGain.disconnect(destModule.audioNode);
    }
  }
}
