const Assets = {
  images: {},

  load(paths) {
    for (const path of paths) {
      if (!path || this.images[path]) continue;
      const image = new Image();
      image.src = path;
      this.images[path] = image;
    }
  },

  get(path) {
    const image = this.images[path];
    return image?.complete && image.naturalWidth > 0 ? image : null;
  },
};
