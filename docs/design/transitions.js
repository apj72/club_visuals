// Snapshot of the real registry for the offline design prototype; no renderer is loaded.
window.DESIGN_TRANSITIONS = [
  {
    "id": "cut",
    "name": "Cut",
    "category": "Classic",
    "description": "Instant replacement",
    "parameterDefinitions": {},
    "safetyTags": []
  },
  {
    "id": "fade-in",
    "name": "Fade In",
    "category": "Classic",
    "description": "Reveal from black",
    "parameterDefinitions": {},
    "safetyTags": []
  },
  {
    "id": "fade-out",
    "name": "Fade Out/In",
    "category": "Classic",
    "description": "Pass through black",
    "parameterDefinitions": {},
    "safetyTags": []
  },
  {
    "id": "cross-dissolve",
    "name": "Cross Dissolve",
    "category": "Classic",
    "description": "Blend the two clips",
    "parameterDefinitions": {},
    "safetyTags": []
  },
  {
    "id": "wipe",
    "name": "Wipe",
    "category": "Classic",
    "description": "Sweep the old clip away",
    "parameterDefinitions": {},
    "safetyTags": []
  },
  {
    "id": "zoom-spin",
    "name": "Zoom / Spin",
    "category": "Motion",
    "description": "Zoom and rotate the old frame",
    "parameterDefinitions": {},
    "safetyTags": []
  },
  {
    "id": "whip-pan",
    "name": "Whip Pan",
    "category": "Motion",
    "description": "Fast blurred lateral sweep",
    "parameterDefinitions": {},
    "safetyTags": []
  },
  {
    "id": "pixel-scatter",
    "name": "Pixel Scatter",
    "category": "Digital",
    "description": "Shuffled blocks clear to the next clip",
    "parameterDefinitions": {},
    "safetyTags": []
  },
  {
    "id": "data-tear",
    "name": "Data Tear",
    "category": "Digital",
    "description": "Displaced scan strips and colour edges",
    "parameterDefinitions": {},
    "safetyTags": []
  },
  {
    "id": "iris-burst",
    "name": "Iris Burst",
    "category": "Geometry",
    "description": "Circular reveal from the centre",
    "parameterDefinitions": {},
    "safetyTags": []
  },
  {
    "id": "shutters",
    "name": "Shutters",
    "category": "Geometry",
    "description": "Horizontal strips collapse",
    "parameterDefinitions": {},
    "safetyTags": []
  },
  {
    "id": "rgb-split",
    "name": "RGB Split",
    "category": "Digital",
    "description": "Separate and recombine colour channels",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.6
      },
      "direction": {
        "type": "choice",
        "values": [
          "horizontal",
          "vertical"
        ],
        "default": "horizontal"
      }
    },
    "safetyTags": []
  },
  {
    "id": "infinite-zoom",
    "name": "Infinite Zoom",
    "category": "Motion",
    "description": "Rush through the source into the next clip",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.7
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      }
    },
    "safetyTags": []
  },
  {
    "id": "neon-shockwave",
    "name": "Neon Shockwave",
    "category": "Light",
    "description": "A luminous expanding ring reveals the target",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "color": {
        "type": "color",
        "default": "#52f5d0"
      }
    },
    "safetyTags": [
      "high-contrast"
    ]
  },
  {
    "id": "digital-glitch",
    "name": "Digital Glitch",
    "category": "Glitch and Digital",
    "description": "Displaced horizontal and vertical fragments reveal the next clip",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "direction": {
        "type": "choice",
        "values": [
          "horizontal",
          "vertical"
        ],
        "default": "horizontal"
      }
    },
    "safetyTags": []
  },
  {
    "id": "datamosh",
    "name": "Datamosh",
    "category": "Glitch and Digital",
    "description": "Codec-style motion blocks smear between clips (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "pixel-explosion",
    "name": "Pixel Explosion",
    "category": "Glitch and Digital",
    "description": "Small blocks burst outward before the target reforms (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "scanline-interference",
    "name": "Scanline Interference",
    "category": "Glitch and Digital",
    "description": "CRT scanlines progressively replace the source",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "direction": {
        "type": "choice",
        "values": [
          "horizontal",
          "vertical"
        ],
        "default": "horizontal"
      }
    },
    "safetyTags": []
  },
  {
    "id": "digital-signal-loss",
    "name": "Digital Signal Loss",
    "category": "Glitch and Digital",
    "description": "Static, sync drift, and colour interference settle on the target",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": [
      "flash",
      "high-contrast"
    ]
  },
  {
    "id": "pixel-sorting",
    "name": "Pixel Sorting",
    "category": "Glitch and Digital",
    "description": "Luminance-directed colour streaks flow into the target (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "direction": {
        "type": "choice",
        "values": [
          "horizontal",
          "vertical"
        ],
        "default": "horizontal"
      }
    },
    "safetyTags": []
  },
  {
    "id": "block-corruption",
    "name": "Block Corruption",
    "category": "Glitch and Digital",
    "description": "Rectangular blocks flicker and shift to reveal the target",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "kaleidoscope-morph",
    "name": "Kaleidoscope Morph",
    "category": "Psychedelic",
    "description": "Mirrored rotating segments resolve into the next clip",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      }
    },
    "safetyTags": []
  },
  {
    "id": "spiral-vortex",
    "name": "Spiral Vortex",
    "category": "Psychedelic",
    "description": "A twisting vortex pulls the old image into the new",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      }
    },
    "safetyTags": []
  },
  {
    "id": "liquid-morph",
    "name": "Liquid Morph",
    "category": "Psychedelic",
    "description": "Flowing distortions melt the two clips together (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "fractal-dissolve",
    "name": "Fractal Dissolve",
    "category": "Psychedelic",
    "description": "Layered fractal noise traces the reveal",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "psychedelic-tunnel",
    "name": "Psychedelic Tunnel",
    "category": "Psychedelic",
    "description": "Repeating perspective patterns rush into the next clip",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      }
    },
    "safetyTags": []
  },
  {
    "id": "mandala-rotation",
    "name": "Mandala Rotation",
    "category": "Psychedelic",
    "description": "Symmetric petals rotate and unfold",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      }
    },
    "safetyTags": []
  },
  {
    "id": "mirror-shatter",
    "name": "Mirror Shatter",
    "category": "Psychedelic",
    "description": "Mirrored facets pivot apart and reassemble (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "waveform-warp",
    "name": "Waveform Warp",
    "category": "Psychedelic",
    "description": "Oscillating bands bend the outgoing scene",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "direction": {
        "type": "choice",
        "values": [
          "horizontal",
          "vertical"
        ],
        "default": "horizontal"
      }
    },
    "safetyTags": []
  },
  {
    "id": "white-flash",
    "name": "White Flash",
    "category": "Light",
    "description": "A short white burst reveals the next clip",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "color": {
        "type": "color",
        "default": "#ffffff"
      }
    },
    "safetyTags": [
      "flash",
      "high-contrast"
    ]
  },
  {
    "id": "laser-sweep",
    "name": "Laser Sweep",
    "category": "Light",
    "description": "Bright sweeping lines expose the incoming image",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "color": {
        "type": "color",
        "default": "#52f5d0"
      },
      "direction": {
        "type": "choice",
        "values": [
          "horizontal",
          "vertical"
        ],
        "default": "horizontal"
      }
    },
    "safetyTags": [
      "high-contrast"
    ]
  },
  {
    "id": "electric-arc",
    "name": "Electric Arc",
    "category": "Light",
    "description": "Branching electrical paths tear across the frame",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "color": {
        "type": "color",
        "default": "#8bbaff"
      }
    },
    "safetyTags": [
      "high-contrast"
    ]
  },
  {
    "id": "strobe-cut",
    "name": "Strobe Cut",
    "category": "Light",
    "description": "Alternating cuts settle on the incoming clip",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": [
      "flash",
      "high-contrast"
    ]
  },
  {
    "id": "energy-burst",
    "name": "Energy Burst",
    "category": "Light",
    "description": "A coloured radial blast opens onto the target",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "color": {
        "type": "color",
        "default": "#ffb13b"
      }
    },
    "safetyTags": [
      "high-contrast"
    ]
  },
  {
    "id": "light-leak",
    "name": "Light Leak",
    "category": "Light",
    "description": "Coloured light floods inward from the edges",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "color": {
        "type": "color",
        "default": "#ff6d8a"
      },
      "direction": {
        "type": "choice",
        "values": [
          "horizontal",
          "vertical"
        ],
        "default": "horizontal"
      }
    },
    "safetyTags": []
  },
  {
    "id": "plasma-dissolve",
    "name": "Plasma Dissolve",
    "category": "Light",
    "description": "Glowing plasma clouds consume the source",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "color": {
        "type": "color",
        "default": "#c445ff"
      }
    },
    "safetyTags": [
      "high-contrast"
    ]
  },
  {
    "id": "hexagonal-mosaic",
    "name": "Hexagonal Mosaic",
    "category": "Geometry and Motion",
    "description": "Hexagonal cells turn over to reveal the target",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "geometric-shatter",
    "name": "Geometric Shatter",
    "category": "Geometry and Motion",
    "description": "Polygon fragments fly apart (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "cube-rotation",
    "name": "3D Cube Rotation",
    "category": "Geometry and Motion",
    "description": "Perspective cube faces turn from source to target",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "radial-slice",
    "name": "Radial Slice",
    "category": "Geometry and Motion",
    "description": "Rotating wedges replace the picture",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      }
    },
    "safetyTags": []
  },
  {
    "id": "tunnel-warp",
    "name": "Tunnel Warp",
    "category": "Geometry and Motion",
    "description": "Perspective bending rushes into the next shot",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      }
    },
    "safetyTags": []
  },
  {
    "id": "particle-disintegration",
    "name": "Particle Disintegration",
    "category": "Geometry and Motion",
    "description": "Fine image fragments drift away (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "motion-blur-whip",
    "name": "Motion Blur Whip",
    "category": "Geometry and Motion",
    "description": "A heavy blurred sideways sweep lands on the next shot",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "direction": {
        "type": "choice",
        "values": [
          "horizontal",
          "vertical"
        ],
        "default": "horizontal"
      }
    },
    "safetyTags": []
  },
  {
    "id": "smoke-dissolve",
    "name": "Smoke Dissolve",
    "category": "Organic and Atmospheric",
    "description": "Billowing noise conceals the old image (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "ink-in-water",
    "name": "Ink in Water",
    "category": "Organic and Atmospheric",
    "description": "Dark branching ink tendrils spread through the image (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "fluid-ripple",
    "name": "Fluid Ripple",
    "category": "Organic and Atmospheric",
    "description": "Concentric liquid waves uncover the next clip",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      }
    },
    "safetyTags": []
  },
  {
    "id": "fire-burn",
    "name": "Fire Burn",
    "category": "Organic and Atmospheric",
    "description": "A noisy flame edge burns away the source",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "color": {
        "type": "color",
        "default": "#ff6b18"
      }
    },
    "safetyTags": [
      "high-contrast"
    ]
  },
  {
    "id": "ice-crystallisation",
    "name": "Ice Crystallisation",
    "category": "Organic and Atmospheric",
    "description": "Angular frost patterns grow across the frame (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "color": {
        "type": "color",
        "default": "#b8edff"
      }
    },
    "safetyTags": []
  },
  {
    "id": "sandstorm",
    "name": "Sandstorm",
    "category": "Organic and Atmospheric",
    "description": "Granular wind strips the old image away (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "direction": {
        "type": "choice",
        "values": [
          "horizontal",
          "vertical"
        ],
        "default": "horizontal"
      }
    },
    "safetyTags": []
  },
  {
    "id": "liquid-chrome",
    "name": "Liquid Chrome",
    "category": "Organic and Atmospheric",
    "description": "Reflective silver ripples flow into the target",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "color": {
        "type": "color",
        "default": "#d9e4ef"
      }
    },
    "safetyTags": []
  },
  {
    "id": "organic-cell-division",
    "name": "Organic Cell Division",
    "category": "Organic and Atmospheric",
    "description": "Soft expanding cells merge into the new image",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "reality-fracture",
    "name": "Reality Fracture",
    "category": "Experimental",
    "description": "Offset spatial planes display fragments of both clips",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "time-echo",
    "name": "Time Echo",
    "category": "Experimental",
    "description": "Multiple delayed image echoes converge on the target",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "chromatic-implosion",
    "name": "Chromatic Implosion",
    "category": "Experimental",
    "description": "Separated colour channels collapse and burst outward",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      }
    },
    "safetyTags": []
  },
  {
    "id": "neural-network-morph",
    "name": "Neural Network Morph",
    "category": "Experimental",
    "description": "A luminous node mesh grows over the transition",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "color": {
        "type": "color",
        "default": "#72ffe1"
      }
    },
    "safetyTags": []
  },
  {
    "id": "holographic-breakdown",
    "name": "Holographic Breakdown",
    "category": "Experimental",
    "description": "A translucent scan image destabilises and rebuilds",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "color": {
        "type": "color",
        "default": "#52f5d0"
      }
    },
    "safetyTags": [
      "high-contrast"
    ]
  },
  {
    "id": "gravity-well",
    "name": "Gravity Well",
    "category": "Experimental",
    "description": "A dark lens pulls the source inward and releases the target",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      }
    },
    "safetyTags": []
  },
  {
    "id": "quantum-tiles",
    "name": "Quantum Tiles",
    "category": "Experimental",
    "description": "Dense tiles reorder to reconstruct the next scene (shader simulation)",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      }
    },
    "safetyTags": []
  },
  {
    "id": "spectral-frequency-shift",
    "name": "Spectral Frequency Shift",
    "category": "Experimental",
    "description": "Oscillating luminous frequency bands reform as the target",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "color": {
        "type": "color",
        "default": "#52f5d0"
      }
    },
    "safetyTags": []
  },
  {
    "id": "dimensional-portal",
    "name": "Dimensional Portal",
    "category": "Experimental",
    "description": "An expanding luminous portal opens onto the next clip",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "color": {
        "type": "color",
        "default": "#a274ff"
      }
    },
    "safetyTags": []
  },
  {
    "id": "bass-impact-distortion",
    "name": "Bass Impact Distortion",
    "category": "Experimental",
    "description": "A heavy radial shockwave reveals the target on impact",
    "parameterDefinitions": {
      "intensity": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.65
      },
      "centerX": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "centerY": {
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
      },
      "color": {
        "type": "color",
        "default": "#ff6d3d"
      }
    },
    "safetyTags": [
      "high-contrast"
    ]
  }
];
