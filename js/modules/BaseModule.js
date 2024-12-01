export default class BaseModule {
  constructor(context, id, x, y) {
    this.audioContext = context;
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = 150;
    this.height = 120;
    this.inputs = [];
    this.outputs = [];
    this.controls = [];
    this.isPlaying = false;
    this.audioNode = null;
    this.element = null;
  }

  createDOM() {
    const elem = document.createElement("div");
    elem.className = "audio-module";
    elem.classList.add(`module-${this.type}`);
    elem.id = this.id;
    elem.style.left = `${this.x}px`;
    elem.style.top = `${this.y}px`;
    elem.style.height = `${this.height}px`;

    const title = document.createElement("div");
    title.className = "module-title";
    title.textContent = this.type;
    elem.appendChild(title);

    this.createConnectionPoints(elem);
    this.createControls(elem);

    this.element = elem;
    return elem;
  }

  createConnectionPoints(elem) {
    this.inputs.forEach((input, index) => {
      const point = document.createElement("div");
      point.className = "connection-point input";
      point.style.top = `${input.y}px`;
      point.style.transform = "translate(-50%, -50%)";
      point.dataset.type = "input";
      point.dataset.index = index;
      elem.appendChild(point);
    });

    this.outputs.forEach((output, index) => {
      const point = document.createElement("div");
      point.className = "connection-point output";
      point.style.top = `${output.y}px`;
      point.style.transform = "translate(50%, -50%)";
      point.dataset.type = "output";
      point.dataset.index = index;
      elem.appendChild(point);
    });
  }

  createControls(elem) {
    this.controls.forEach((control) => {
      const container = document.createElement("div");
      container.className = "module-control";

      const label = document.createElement("label");
      label.textContent = control.label;
      container.appendChild(label);

      let input;
      if (control.type === "slider") {
        input = document.createElement("input");
        input.type = "range";
        input.min = control.min;
        input.max = control.max;
        input.step = control.step || 1;
        input.value = control.value;
        input.addEventListener("input", (e) =>
          control.onChange(parseFloat(e.target.value))
        );
      } else if (control.type === "select") {
        input = document.createElement("select");
        control.options.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = opt;
          input.appendChild(option);
        });
        input.value = control.value;
        input.addEventListener("change", (e) =>
          control.onChange(e.target.value)
        );
      }

      container.appendChild(input);
      elem.appendChild(container);
    });
  }

  connect(destModule) {
    if (this.audioNode && destModule.audioNode) {
      this.audioNode.connect(destModule.audioNode);
    }
  }

  disconnect(module) {
    try {
      if (this.audioNode && module.audioNode) {
        this.audioNode.disconnect(module.audioNode);
      }
    } catch (e) {
      console.log("Already disconnected or invalid connection");
    }
  }

  start() {
    // Override in subclasses if needed
  }

  stop() {
    // Override in subclasses if needed
  }
}
