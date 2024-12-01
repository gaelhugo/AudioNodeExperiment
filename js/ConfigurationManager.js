export default class ConfigurationManager {
  constructor(app) {
    this.app = app;
    this.createUI();
    this.debug();
  }

  debug() {
    console.log("ConfigurationManager");
    this.app.modules.forEach((module) => {
      console.log("Module name:", module.constructor.name);
    });
  }

  createUI() {
    const container = document.createElement("div");
    container.className = "config-manager";

    // Save button
    const saveButton = document.createElement("button");
    saveButton.className = "config-button save-button";
    saveButton.textContent = "Save Config";
    saveButton.addEventListener("click", () => this.saveConfiguration());

    // Load button with file input
    const loadButton = document.createElement("button");
    loadButton.className = "config-button load-button";
    loadButton.textContent = "Load Config";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", (e) =>
      this.loadConfiguration(e.target.files[0])
    );

    loadButton.addEventListener("click", () => fileInput.click());

    container.appendChild(saveButton);
    container.appendChild(loadButton);
    container.appendChild(fileInput);

    document.body.appendChild(container);
  }

  saveConfiguration() {
    const config = {
      modules: [],
      connections: [],
      autoplay: true,
    };

    // Save modules
    this.app.modules.forEach((module) => {
      const moduleConfig = {
        id: module.id,
        type: module.constructor.name.replace("Module", "").toLowerCase(),
        x: module.x,
        y: module.y,
        settings: this.getModuleSettings(module),
      };
      config.modules.push(moduleConfig);
    });

    // Save connections
    this.app.connections.forEach((conn) => {
      config.connections.push({
        from: conn.from,
        to: conn.to,
      });
    });

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `synth-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async loadConfiguration(file) {
    try {
      const text = await file.text();
      const config = JSON.parse(text);

      // Clear existing setup
      this.app.stopAudio();
      this.app.connections = [];
      this.app.modules.forEach((module) => {
        module.element.remove();
      });
      this.app.modules.clear();

      // Reset module ID counter
      this.app.moduleId = 0;

      // Create modules with their original IDs
      for (const moduleConfig of config.modules) {
        // Handle both visualizer types
        let type = moduleConfig.type;
        if (type === "soundwavevisualizer") type = "visualizer";
        if (type === "spectrumvisualizer") type = "spectrum";

        const module = this.app.createModule(
          type,
          moduleConfig.x,
          moduleConfig.y,
          moduleConfig.id
        );

        if (module) {
          this.applyModuleSettings(module, moduleConfig.settings);
        }
      }

      // Create connections after all modules are created
      requestAnimationFrame(() => {
        for (const conn of config.connections) {
          const fromModule = this.app.modules.get(conn.from);
          const toModule = this.app.modules.get(conn.to);
          if (fromModule && toModule) {
            this.app.createConnection(fromModule, toModule);
          }
        }

        // If autoplay is true, start everything
        if (config.autoplay) {
          setTimeout(() => {
            // Start main audio first
            if (!this.app.isPlaying) {
              this.app.togglePlay();
            }

            // Additional delay for sequencers and slicers
            setTimeout(() => {
              this.app.modules.forEach((module) => {
                const moduleConfig = config.modules.find(
                  (m) => m.id === module.id
                );
                if (!moduleConfig || !moduleConfig.settings) return;

                if (
                  (module.constructor.name === "SequencerModule" ||
                    module.constructor.name === "SlicerModule") &&
                  moduleConfig.settings.isPlaying
                ) {
                  const playButton = module.element.querySelector(
                    `.${module.type}-play-button`
                  );
                  if (playButton && playButton.textContent === "Play") {
                    playButton.click();
                  }
                }
              });
            }, 300); // Additional delay for sequencers and slicers
          }, 200); // Delay for main audio start
        }
      });
    } catch (error) {
      console.error("Error loading configuration:", error);
      alert("Error loading configuration file");
    }
  }

  getModuleSettings(module) {
    const settings = {};

    try {
      switch (module.constructor.name) {
        case "SequencerModule":
          // Save sequence data
          settings.sequence = Array(module.steps)
            .fill(null)
            .map((_, i) => {
              const select = module.element.querySelector(
                `.sequencer-step:nth-child(${i + 1}) select`
              );
              const noteDisplay = module.element.querySelector(
                `.sequencer-step:nth-child(${i + 1}) .note-display`
              );
              const value = select ? select.value : "";

              // Also update the note display
              if (noteDisplay) {
                noteDisplay.textContent = value || "-";
              }

              return value;
            });
          settings.bpm = parseInt(
            module.element.querySelector('input[type="number"]').value
          );
          settings.isPlaying = module.isPlaying;
          break;

        case "SlicerModule":
          settings.sequence = Array(module.steps)
            .fill(null)
            .map((_, i) => {
              const step = module.element.querySelector(
                `.slicer-step:nth-child(${i + 1})`
              );
              return step && step.classList.contains("active") ? 1 : 0;
            });
          //   settings.bpm = module.bpm;
          //   settings.depth = module.depth;
          if (module.audioNode) {
            const sliders = module.element.querySelectorAll(
              ".module-control input[type='range']"
            );
            sliders.forEach((slider) => {
              settings[
                slider.previousElementSibling.textContent.toLowerCase()
              ] = parseFloat(slider.value);
            });
          }

          settings.isPlaying = module.isPlaying;
          break;

        case "OscillatorModule":
          if (module.audioNode) {
            settings.waveform = module.audioNode.type;
            // if (module.audioNode.frequency) {
            //   settings.frequency = module.audioNode.frequency.value;
            // }
            // check slider value for each available slider
            // use the label text to name the slider
            const sliders = module.element.querySelectorAll(
              ".module-control input[type='range']"
            );
            sliders.forEach((slider) => {
              settings[
                slider.previousElementSibling.textContent.toLowerCase()
              ] = parseFloat(slider.value);
            });
          }
          break;

        case "GainModule":
          //   if (module.audioNode && module.audioNode.gain) {
          //     settings.gain = module.audioNode.gain.value;
          //   }
          const sliders = module.element.querySelectorAll(
            ".module-control input[type='range']"
          );
          sliders.forEach((slider) => {
            settings[slider.previousElementSibling.textContent.toLowerCase()] =
              parseFloat(slider.value);
          });
          break;

        case "LFOModule":
          if (module.audioNode) {
            settings.waveform = module.audioNode.type;
            // if (module.audioNode.frequency) {
            //   settings.rate = module.audioNode.frequency.value;
            // }
            const sliders = module.element.querySelectorAll(
              ".module-control input[type='range']"
            );
            sliders.forEach((slider) => {
              settings[
                slider.previousElementSibling.textContent.toLowerCase()
              ] = parseFloat(slider.value);
            });
          }
          //   if (module.gainNode && module.gainNode.gain) {
          //     settings.depth = module.gainNode.gain.value;
          //   }
          break;

        case "DelayModule":
          //   if (module.audioNode && module.audioNode.delayTime) {
          //     settings.time = module.audioNode.delayTime.value;
          //   }
          //   if (module.feedbackGain && module.feedbackGain.gain) {
          //     settings.feedback = module.feedbackGain.gain.value;
          //   }
          if (module.audioNode) {
            const sliders = module.element.querySelectorAll(
              ".module-control input[type='range']"
            );
            sliders.forEach((slider) => {
              settings[
                slider.previousElementSibling.textContent.toLowerCase()
              ] = parseFloat(slider.value);
            });
          }
          break;

        case "KeyboardModule":
          settings.sustain = module.sustain;
          break;

        case "ReverbModule":
          //   if (module.audioNode) {
          //     settings.mix = module.mix;
          //     settings.decay = module.decay;
          //   }
          if (module.audioNode) {
            const sliders = module.element.querySelectorAll(
              ".module-control input[type='range']"
            );
            sliders.forEach((slider) => {
              settings[
                slider.previousElementSibling.textContent.toLowerCase()
              ] = parseFloat(slider.value);
            });
          }
          break;

        case "SoundwaveVisualizerModule":
        case "SpectrumVisualizerModule":
          settings.type = module.constructor.name
            .replace("Module", "")
            .toLowerCase();
          break;

        case "SamplerModule":
          if (module) {
            // Get all control values
            const sliders = module.element.querySelectorAll(
              ".module-control input[type='range']"
            );
            sliders.forEach((slider) => {
              const label =
                slider.previousElementSibling.textContent.toLowerCase();
              settings[label] = parseFloat(slider.value);
            });

            // Store specific sampler properties
            settings.startPosition = module.startPosition || 0;
            settings.playbackRate = module.playbackRate || 1;
            settings.volume = module.audioNode.gain.value || 1;
          }
          break;
      }
    } catch (error) {
      console.warn(
        `Error getting settings for ${module.constructor.name}:`,
        error
      );
    }

    return settings;
  }

  applyModuleSettings(module, settings) {
    if (!settings) return;

    try {
      switch (module.constructor.name) {
        case "SequencerModule":
          // Apply BPM first
          if (settings.bpm) {
            module.bpm = settings.bpm;
            const bpmInput = module.element.querySelector(
              'input[type="number"]'
            );
            if (bpmInput) {
              bpmInput.value = settings.bpm;
            }
          }

          // Apply sequence
          if (settings.sequence) {
            module.sequence = [...settings.sequence];
            settings.sequence.forEach((note, index) => {
              const step = module.element.querySelector(
                `.sequencer-step:nth-child(${index + 1})`
              );
              if (step) {
                const select = step.querySelector("select");
                const noteDisplay = step.querySelector(".note-display");

                if (select) {
                  select.value = note;
                  // Update visual state
                  if (note) {
                    step.classList.add("has-note");
                  } else {
                    step.classList.remove("has-note");
                  }
                }

                if (noteDisplay) {
                  noteDisplay.textContent = note || "-";
                }
              }
            });
          }

          // Store settings for later use
          module.settings = settings;

          // If it was playing, restart it
          if (settings.isPlaying) {
            setTimeout(() => {
              const playButton = module.element.querySelector(
                ".sequencer-play-button"
              );
              if (playButton && playButton.textContent === "Play") {
                playButton.click();
              }
            }, 100);
          }
          break;

        case "SlicerModule":
          // Store the settings directly on the module for later use
          module.settings = settings;

          // Apply immediate settings
          if (settings["rate (bpm)"]) {
            module.bpm = settings["rate (bpm)"];
            console.log(module.element.querySelector(".bpm-value"));
            module.element.querySelector(".bpm-value").textContent =
              settings["rate (bpm)"];
          }
          if (settings.depth) module.depth = settings.depth;
          if (settings.sequence) {
            module.sequence = [...settings.sequence];

            // Update UI
            settings.sequence.forEach((value, index) => {
              if (module.constructor.name === "SequencerModule") {
                const select = module.element.querySelector(
                  `.sequencer-step:nth-child(${index + 1}) select`
                );
                if (select) {
                  select.value = value;
                  select.dispatchEvent(new Event("change"));
                }
              } else {
                const step = module.element.querySelector(
                  `.slicer-step:nth-child(${index + 1})`
                );
                if (step) {
                  if (value) {
                    step.classList.add("active");
                  } else {
                    step.classList.remove("active");
                  }
                }
              }
            });
          }
          if (settings) {
            //update all sliders
            const sliders = module.element.querySelectorAll(
              ".module-control input[type='range']"
            );
            sliders.forEach((slider) => {
              slider.value =
                settings[
                  slider.previousElementSibling.textContent.toLowerCase()
                ];
            });
          }
          break;

        case "OscillatorModule":
          if (settings.waveform) {
            module.audioNode.type = settings.waveform;
            // update waveform selector
            const _selector = module.element.querySelector(
              ".module-control select"
            );
            if (_selector) {
              _selector.value = settings.waveform;
            }
          }
          if (settings.frequency) {
            module.audioNode.frequency.setValueAtTime(
              settings.frequency,
              module.audioContext.currentTime
            );
            // update slider position
            const slider = module.element.querySelector(
              ".module-control input[type='range']"
            );
            if (slider) {
              slider.value = settings.frequency;
            }
          }

          break;

        case "GainModule":
          if (settings.gain) {
            module.audioNode.gain.setValueAtTime(
              settings.gain,
              module.audioContext.currentTime
            );
            // update slider position
            const slider = module.element.querySelector(
              ".module-control input[type='range']"
            );
            if (slider) {
              slider.value = settings.gain;
            }
          }

          break;

        case "LFOModule":
          if (settings.waveform) {
            console.log("default value", module.audioNode.type);
            setTimeout(() => {
              module.audioNode.type = settings.waveform;
              console.log("after value", settings.waveform);
            }, 250);
            //set selector
            const _selector = module.element.querySelector(
              ".module-control select"
            );
            if (_selector) {
              _selector.value = settings.waveform;
            }
          }
          if (settings.rate) {
            module.audioNode.frequency.setValueAtTime(
              settings.rate,
              module.audioContext.currentTime
            );
          }
          if (settings.depth) {
            module.gainNode.gain.setValueAtTime(
              settings.depth,
              module.audioContext.currentTime
            );
          }
          if (settings) {
            //update all sliders
            const sliders = module.element.querySelectorAll(
              ".module-control input[type='range']"
            );
            sliders.forEach((slider) => {
              slider.value =
                settings[
                  slider.previousElementSibling.textContent.toLowerCase()
                ];
            });
          }
          break;

        case "DelayModule":
          if (settings.time) {
            module.audioNode.delayTime.setValueAtTime(
              settings.time,
              module.audioContext.currentTime
            );
          }
          if (settings.feedback) {
            module.feedbackNode.gain.setValueAtTime(
              settings.feedback,
              module.audioContext.currentTime
            );
          }
          if (settings) {
            //update all sliders
            const sliders = module.element.querySelectorAll(
              ".module-control input[type='range']"
            );
            sliders.forEach((slider) => {
              slider.value =
                settings[
                  slider.previousElementSibling.textContent.toLowerCase()
                ];
            });
          }
          break;

        case "KeyboardModule":
          if (typeof settings.sustain !== "undefined") {
            module.sustain = settings.sustain;
            // Update the sustain checkbox
            const sustainCheckbox =
              module.element.querySelector(".sustain-checkbox");
            if (sustainCheckbox) {
              sustainCheckbox.checked = settings.sustain;
              // Trigger the change event to update any related state
              const event = new Event("change");
              sustainCheckbox.dispatchEvent(event);
            }
          }
          break;

        case "ReverbModule":
          if (settings.mix) module.mix = settings.mix;
          if (settings.decay) module.decay = settings.decay;
          if (settings) {
            //update all sliders
            const sliders = module.element.querySelectorAll(
              ".module-control input[type='range']"
            );
            sliders.forEach((slider) => {
              slider.value =
                settings[
                  slider.previousElementSibling.textContent.toLowerCase()
                ];
            });
          }
          break;

        case "SoundwaveVisualizerModule":
        case "SpectrumVisualizerModule":
          if (module.startAnimation) {
            module.startAnimation();
          }
          break;

        case "SamplerModule":
          if (settings) {
            // Update all sliders and their corresponding values
            const sliders = module.element.querySelectorAll(
              ".module-control input[type='range']"
            );
            sliders.forEach((slider) => {
              const label =
                slider.previousElementSibling.textContent.toLowerCase();
              if (settings[label] !== undefined) {
                slider.value = settings[label];
                // Trigger both input and change events
                slider.dispatchEvent(new Event("input"));
                slider.dispatchEvent(new Event("change"));
              }
            });

            // Apply specific sampler properties
            if (settings.startPosition !== undefined) {
              module.startPosition = settings.startPosition;
            }
            if (settings.playbackRate !== undefined) {
              module.playbackRate = settings.playbackRate;
            }
            if (settings.volume !== undefined) {
              module.audioNode.gain.setValueAtTime(
                settings.volume,
                module.audioContext.currentTime
              );
            }
          }
          break;
      }

      // Update UI elements
      if (module.element) {
        module.element.querySelectorAll("input, select").forEach((input) => {
          if (input.type !== "checkbox") {
            // Skip checkboxes as they're handled separately
            const event = new Event("change");
            input.dispatchEvent(event);
          }
        });
      }
    } catch (error) {
      console.warn(
        `Error applying settings for ${module.constructor.name}:`,
        error
      );
    }
  }
}
