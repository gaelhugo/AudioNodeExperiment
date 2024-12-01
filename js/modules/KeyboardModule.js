import BaseModule from "./BaseModule.js";

export default class KeyboardModule extends BaseModule {
  constructor(audioContext, id, x, y) {
    super(audioContext, id, x, y);
    this.title = "Keyboard";
    this.inputs = ["trigger"];
    this.outputs = ["frequency"];
    this.connectedOscillators = new Set();
    this.connectedSamplers = new Set();
    this.sustain = true;

    this.width = 400;
    this.height = 220;

    this.frequencies = {
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

  createDOM() {
    const element = document.createElement("div");
    element.className = "audio-module module-keyboard";
    element.id = this.id;
    element.style.left = `${this.x}px`;
    element.style.top = `${this.y}px`;

    // Add title
    const title = document.createElement("div");
    title.className = "module-title";
    title.textContent = this.title;
    element.appendChild(title);

    // Add control panel
    const controlPanel = document.createElement("div");
    controlPanel.className = "keyboard-control-panel";

    // Add note display
    const noteDisplay = document.createElement("div");
    noteDisplay.className = "keyboard-note-display";
    noteDisplay.innerHTML =
      '<span class="note-label">Note:</span> <span class="note-value">-</span>';
    controlPanel.appendChild(noteDisplay);

    // Add sustain control
    const sustainControl = document.createElement("div");
    sustainControl.className = "sustain-control";

    const sustainLabel = document.createElement("label");
    sustainLabel.textContent = "Sustain";
    sustainLabel.className = "sustain-label";

    const sustainCheckbox = document.createElement("input");
    sustainCheckbox.type = "checkbox";
    sustainCheckbox.checked = this.sustain;
    sustainCheckbox.className = "sustain-checkbox";
    sustainCheckbox.addEventListener("change", (e) => {
      this.sustain = e.target.checked;
      if (!this.sustain) {
        this.stopAllNotes();
      }
      this.updateKeyEventListeners();
    });

    sustainControl.appendChild(sustainLabel);
    sustainControl.appendChild(sustainCheckbox);
    controlPanel.appendChild(sustainControl);

    element.appendChild(controlPanel);

    // Store the display element reference
    this.noteDisplay = noteDisplay.querySelector(".note-value");

    // Add keyboard container
    const keyboardContainer = document.createElement("div");
    keyboardContainer.className = "keyboard-container";
    const keyboard = this.createControls();
    keyboard.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    keyboardContainer.appendChild(keyboard);
    element.appendChild(keyboardContainer);

    // Add connection points
    const connectionPoints = document.createElement("div");
    connectionPoints.className = "connection-points";

    // Add input point for sequencer control
    const inputPoint = document.createElement("div");
    inputPoint.className = "connection-point input";
    inputPoint.style.top = "30%";
    connectionPoints.appendChild(inputPoint);

    // Add output point
    const outputPoint = document.createElement("div");
    outputPoint.className = "connection-point output";
    outputPoint.style.top = "70%";
    connectionPoints.appendChild(outputPoint);

    element.appendChild(connectionPoints);

    this.element = element;
    return element;
  }

  createControls() {
    const keyboard = document.createElement("div");
    keyboard.className = "piano-keyboard";

    const whiteKeys = document.createElement("div");
    whiteKeys.className = "white-keys";

    ["C", "D", "E", "F", "G", "A", "B", "C5"].forEach((note) => {
      const key = document.createElement("div");
      key.className = "piano-key white-key";
      key.dataset.note = note;
      this.setupKeyEvents(key, note);
      whiteKeys.appendChild(key);
    });

    keyboard.appendChild(whiteKeys);

    ["C#", "D#", "F#", "G#", "A#"].forEach((note) => {
      const key = document.createElement("div");
      key.className = "piano-key black-key";
      key.dataset.note = note;
      this.setupKeyEvents(key, note);
      keyboard.appendChild(key);
    });

    return keyboard;
  }

  setupKeyEvents(key, note) {
    // Remove any existing listeners
    const newKey = key.cloneNode(true);
    key.parentNode?.replaceChild(newKey, key);

    // Add mousedown event
    newKey.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      this.playNote(note);
      this.highlightKey(note, true);
      // Update note display
      this.noteDisplay.textContent = note;
    });

    // Add mouseup and mouseleave events
    newKey.addEventListener("mouseup", () => {
      if (!this.sustain) {
        this.stopAllNotes();
        this.highlightKey(note, false);
        // Clear note display
        this.noteDisplay.textContent = "-";
      }
    });

    newKey.addEventListener("mouseleave", () => {
      if (!this.sustain) {
        this.stopAllNotes();
        this.highlightKey(note, false);
        // Clear note display
        this.noteDisplay.textContent = "-";
      }
    });

    return newKey;
  }

  updateKeyEventListeners() {
    const keys = this.element.querySelectorAll(".piano-key");
    keys.forEach((key) => {
      const note = key.dataset.note;
      this.setupKeyEvents(key, note);
    });
  }

  playNote(note) {
    // Handle oscillators
    const frequency = this.frequencies[note];
    this.connectedOscillators.forEach((oscillator) => {
      if (oscillator.audioNode && oscillator.audioNode.frequency) {
        oscillator.audioNode.frequency.setValueAtTime(
          frequency,
          this.audioContext.currentTime
        );

        // Update the frequency slider
        const frequencySlider = oscillator.element.querySelector(
          'input[type="range"]'
        );
        if (frequencySlider) {
          frequencySlider.value = frequency;
          const event = new Event("input", { bubbles: true });
          frequencySlider.dispatchEvent(event);
        }
      }
    });

    // Handle samplers
    if (this.connectedSamplers) {
      this.connectedSamplers.forEach((sampler) => {
        sampler.handleInput("trigger", note);
      });
    }
  }

  stopAllNotes() {
    // Stop oscillators
    this.connectedOscillators.forEach((oscillator) => {
      if (oscillator.audioNode && oscillator.audioNode.frequency) {
        oscillator.audioNode.frequency.setValueAtTime(
          0,
          this.audioContext.currentTime
        );
      }
    });

    // Stop samplers
    if (this.connectedSamplers) {
      this.connectedSamplers.forEach((sampler) => {
        sampler.handleInput("trigger", null);
      });
    }

    // Clear all key highlights
    if (this.element) {
      const keys = this.element.querySelectorAll(".piano-key");
      keys.forEach((key) => key.classList.remove("active"));
      // Clear note display
      if (this.noteDisplay) {
        this.noteDisplay.textContent = "-";
      }
    }
  }

  connect(module) {
    if (module.constructor.name === "OscillatorModule") {
      this.connectedOscillators.add(module);
      // Set initial frequency and update slider
      if (module.audioNode && module.audioNode.frequency) {
        const initialFreq = this.frequencies["A"];
        module.audioNode.frequency.setValueAtTime(
          initialFreq,
          this.audioContext.currentTime
        );

        const frequencySlider = module.element.querySelector(
          'input[type="range"]'
        );
        if (frequencySlider) {
          frequencySlider.value = initialFreq;
          const event = new Event("input", { bubbles: true });
          frequencySlider.dispatchEvent(event);
        }
      }
    } else if (module.constructor.name === "SamplerModule") {
      this.connectedSamplers = this.connectedSamplers || new Set();
      this.connectedSamplers.add(module);
    }
  }

  disconnect(module) {
    if (module.constructor.name === "OscillatorModule") {
      this.connectedOscillators.delete(module);
    } else if (module.constructor.name === "SamplerModule") {
      if (this.connectedSamplers) {
        this.connectedSamplers.delete(module);
      }
    }
  }

  start() {
    // Set initial frequency for all connected oscillators
    this.connectedOscillators.forEach((oscillator) => {
      if (oscillator.audioNode && oscillator.audioNode.frequency) {
        oscillator.audioNode.frequency.setValueAtTime(
          this.frequencies["A"],
          this.audioContext.currentTime
        );
      }
    });
  }

  stop() {
    // Nothing to do on stop for the keyboard
  }

  handleInput(type, value) {
    if (type === "trigger") {
      // First remove all active highlights
      const keys = this.element.querySelectorAll(".piano-key");
      keys.forEach((key) => key.classList.remove("active"));

      // Update note display
      if (this.noteDisplay) {
        this.noteDisplay.textContent = value || "-";
        const noteDisplayContainer = this.noteDisplay.closest(
          ".keyboard-note-display"
        );
        if (noteDisplayContainer) {
          if (value) {
            noteDisplayContainer.classList.add("playing");
          } else {
            noteDisplayContainer.classList.remove("playing");
          }
        }
      }

      if (value) {
        // Note on
        const frequency = this.frequencies[value];

        // Handle oscillators
        this.connectedOscillators.forEach((oscillator) => {
          if (oscillator.audioNode && oscillator.audioNode.frequency) {
            oscillator.audioNode.frequency.setValueAtTime(
              frequency,
              this.audioContext.currentTime
            );

            // Update the frequency slider
            const frequencySlider = oscillator.element.querySelector(
              'input[type="range"]'
            );
            if (frequencySlider) {
              frequencySlider.value = frequency;
              const event = new Event("input", { bubbles: true });
              frequencySlider.dispatchEvent(event);
            }
          }
        });

        // Handle samplers
        this.connectedSamplers.forEach((sampler) => {
          sampler.handleInput("trigger", value);
        });

        // Find and highlight the specific key
        const keyToHighlight = this.element.querySelector(
          `.piano-key[data-note="${value}"]`
        );
        if (keyToHighlight) {
          keyToHighlight.classList.add("active");
        }
      } else {
        // Note off
        if (!this.sustain) {
          // Stop oscillators
          this.connectedOscillators.forEach((oscillator) => {
            if (oscillator.audioNode && oscillator.audioNode.frequency) {
              oscillator.audioNode.frequency.setValueAtTime(
                0,
                this.audioContext.currentTime
              );
            }
          });

          // Stop samplers
          this.connectedSamplers.forEach((sampler) => {
            sampler.handleInput("trigger", null);
          });

          // Remove all key highlights
          keys.forEach((key) => key.classList.remove("active"));
          // Reset note display
          if (this.noteDisplay) {
            this.noteDisplay.textContent = "-";
            const noteDisplayContainer = this.noteDisplay.closest(
              ".keyboard-note-display"
            );
            if (noteDisplayContainer) {
              noteDisplayContainer.classList.remove("playing");
            }
          }
        }
      }
    }
  }

  // Add this method to highlight/unhighlight keys
  highlightKey(note, active) {
    if (!this.element) return;

    const keys = this.element.querySelectorAll(".piano-key");
    keys.forEach((key) => {
      if (key.dataset.note === note) {
        if (active) {
          key.classList.add("active");
        } else {
          key.classList.remove("active");
        }
      }
    });
  }

  // Add this method to handle frequency-adjusted notes:
  playNoteWithFrequency(note, frequency) {
    // First update visual feedback
    const keys = this.element.querySelectorAll(".piano-key");
    keys.forEach((key) => key.classList.remove("active"));

    const keyToHighlight = this.element.querySelector(
      `.piano-key[data-note="${note}"]`
    );
    if (keyToHighlight) {
      keyToHighlight.classList.add("active");
    }

    // Update note display
    if (this.noteDisplay) {
      this.noteDisplay.textContent = note;
      const noteDisplayContainer = this.noteDisplay.closest(
        ".keyboard-note-display"
      );
      if (noteDisplayContainer) {
        noteDisplayContainer.classList.add("playing");
      }
    }

    // Then handle the audio
    this.connectedOscillators.forEach((oscillator) => {
      if (oscillator.audioNode && oscillator.audioNode.frequency) {
        oscillator.audioNode.frequency.setValueAtTime(
          frequency,
          this.audioContext.currentTime
        );

        // Update the frequency slider
        const frequencySlider = oscillator.element.querySelector(
          'input[type="range"]'
        );
        if (frequencySlider) {
          frequencySlider.value = frequency;
          const event = new Event("input", { bubbles: true });
          frequencySlider.dispatchEvent(event);
        }
      }
    });
  }
}
