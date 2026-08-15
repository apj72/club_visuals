"""Screenshot scenarios for Club Visuals user guide."""

config = {
    "base_url": "http://127.0.0.1:8008",
    "output_dir": "docs/screenshots",
    "viewport": [1400, 850],
    "default_wait": "#libraryGrid .library-item",
}

scenarios = [
    {
        "name": "01-main-overview",
        "caption": "Main application window with library, player, and download bar",
        "actions": [
            {"click": "#captionBtn"},
            {"wait": 200},
            {"click": "#libraryGrid .library-item:nth-child(1)"},
            {"wait": 1500},
        ],
    },
    {
        "name": "02-connection-panel",
        "caption": "Instagram connection panel for cookie management",
        "actions": [
            {"click": "#connBtn"},
            {"wait": 500},
        ],
    },
    {
        "name": "03-library-grid",
        "caption": "Video library with thumbnail previews",
        "actions": [
            {"screenshot": ".right-col", "name": "03-library-grid"},
        ],
    },
    {
        "name": "04-playback-single",
        "caption": "Single view playback with controls",
        "actions": [
            {"click": "#captionBtn"},
            {"wait": 200},
            {"click": "#libraryGrid .library-item:nth-child(2)"},
            {"wait": 1500},
        ],
    },
    {
        "name": "05-view-dual",
        "caption": "Dual view with mirrored tiles",
        "actions": [
            {"click": "#captionBtn"},
            {"wait": 200},
            {"click": "#libraryGrid .library-item:nth-child(3)"},
            {"wait": 1000},
            {"click": "#viewBtn"},
            {"wait": 300},
            {"click": "#layoutMenu .popup-opt:nth-child(2)"},
            {"wait": 800},
        ],
    },
    {
        "name": "06-view-octo",
        "caption": "8x view with kaleidoscope mirror preset",
        "actions": [
            {"click": "#captionBtn"},
            {"wait": 200},
            {"click": "#libraryGrid .library-item:nth-child(4)"},
            {"wait": 1000},
            {"click": "#viewBtn"},
            {"wait": 300},
            {"click": "#layoutMenu .popup-opt:nth-child(5)"},
            {"wait": 800},
            {"click": "#presetContainer .preset-btn:nth-child(5)"},
            {"wait": 500},
        ],
    },
    {
        "name": "07-controls-bar",
        "caption": "Playback controls with layout, presets, zoom, and FX buttons",
        "actions": [
            {"click": "#captionBtn"},
            {"wait": 200},
            {"click": "#libraryGrid .library-item:nth-child(1)"},
            {"wait": 1000},
            {"click": "#viewBtn"},
            {"wait": 300},
            {"click": "#layoutMenu .popup-opt:nth-child(5)"},
            {"wait": 500},
            {"screenshot": "#controls", "name": "07-controls-bar"},
        ],
    },
    {
        "name": "08-playlist-tab",
        "caption": "Playlist tab with entry list and add-entry form",
        "actions": [
            {"click": "#captionBtn"},
            {"wait": 200},
            {"click": "#libraryGrid .library-item:nth-child(1)"},
            {"wait": 1000},
            {"click": ".tab:nth-child(2)"},
            {"wait": 500},
        ],
    },
    {
        "name": "09-playlist-autogen",
        "caption": "Auto-generate playlist form",
        "actions": [
            {"click": "#captionBtn"},
            {"wait": 200},
            {"click": "#libraryGrid .library-item:nth-child(1)"},
            {"wait": 1000},
            {"click": ".tab:nth-child(2)"},
            {"wait": 300},
            {"click": ".pl-btn.pl-btn-auto"},
            {"wait": 500},
        ],
    },
    {
        "name": "10-settings-tab",
        "caption": "Settings tab with download folder browser",
        "actions": [
            {"click": "#captionBtn"},
            {"wait": 200},
            {"click": "#libraryGrid .library-item:nth-child(1)"},
            {"wait": 1000},
            {"click": ".tab:nth-child(3)"},
            {"wait": 800},
        ],
    },
    {
        "name": "11-effects-controller",
        "caption": "FX Controller with effect sliders, presets, trails, and audio reactive",
        "url": "/effects",
        "wait": ".fx-sliders",
        "viewport": [420, 700],
        "actions": [],
    },
]
