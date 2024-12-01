import BaseModule from "./BaseModule.js";

export default class DestinationModule extends BaseModule {
  constructor(context, id, x, y) {
    super(context, id, x, y);
    this.title = "Output";
    this.type = "destination";
    this.width = 200;
    this.height = 220;

    // Use audio context destination
    this.audioNode = this.audioContext.destination;

    // Only input, no outputs
    this.inputs = ["audio"];
    this.outputs = [];

    // No controls needed
    this.controls = [];
  }

  createDOM() {
    const element = super.createDOM();

    // Add speaker container
    const speakerContainer = document.createElement("div");
    speakerContainer.className = "speaker-container";
    element.appendChild(speakerContainer);

    // Add connection status update
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          const inputPoint = element.querySelector(".connection-point.input");
          if (inputPoint.classList.contains("connected")) {
            speakerContainer.classList.add("connected");
          } else {
            speakerContainer.classList.remove("connected");
          }
        }
      });
    });

    // Start observing the input connection point
    const inputPoint = element.querySelector(".connection-point.input");
    observer.observe(inputPoint, { attributes: true });

    return element;
  }
}
