export class PixelBgrRenderCoordinator {
  private rendering = false;
  private pending = false;

  run(render: () => void): void {
    if (this.rendering) {
      this.pending = true;
      return;
    }

    this.rendering = true;
    try {
      do {
        this.pending = false;
        render();
      } while (this.pending);
    } finally {
      this.rendering = false;
    }
  }
}
