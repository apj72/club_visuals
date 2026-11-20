#!/usr/bin/env python3
"""Compatibility launcher: the complete interface now lives at /."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import server as v1
from editor_routes import ASSETS, SHOW_LIBRARY
from show_library import ShowLibrary, LibraryConflict


class RedesignHandler(v1.Handler):
    # Keep isolated documentation/check scripts compatible with their store override.
    def get_show_library(self):
        return SHOW_LIBRARY


def main():
    v1.main(handler=RedesignHandler)


if __name__ == '__main__':
    main()
