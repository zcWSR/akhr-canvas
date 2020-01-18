class Measurer {
  constructor(fontFamily) {
    const dom = document.createElement('canvas');
    this.ctx = dom.getContext('2d');
    this.fontFamily = fontFamily;
    this.cache = {};
  }
  text(text, fontSize = 16) {
    const key = `${text}${fontSize}`;
    if (this.cache[key]) {
      return this.cache[key];
    }
    this.ctx.font = `${fontSize}px ${this.fontFamily}`;
    this.ctx.textBaseline = 'top';
    const measure = this.ctx.measureText(text);
    const result = {
      width: measure.width,
      height: measure.actualBoundingBoxDescent
    };
    this.cache[key] = result;
    return result;
  }
}

class Loader {
  constructor() {
    this.imageCache = {};
  }

  async loadImage(src) {
    if (this.imageCache[src]) {
      this.imageCache[src];
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache[src] = img;
        resolve(img);
      };
      img.onerror = e => {
        reject(e);
      };
      img.src = src;
    });
  }
}

const STAFF_LEVEL_BOX_COLOR_MAP = {
  1: '#343a40',
  2: '#f8f9fa',
  3: '#28a745',
  4: '#17a2b8',
  5: '#ffc107',
  6: '#dc3545'
};

const TEXT_COLOR = {
  WHITE: 'white',
  BLACK: '#212529'
};

const STAFF_LEVEL_FONT_COLOR_MAP = {
  1: TEXT_COLOR.WHITE,
  2: TEXT_COLOR.BLACK,
  3: TEXT_COLOR.WHITE,
  4: TEXT_COLOR.WHITE,
  5: TEXT_COLOR.BLACK,
  6: TEXT_COLOR.WHITE
};

class AkhrDrawer {
  /**
   *
   * @param {HR_RESULT} hrList
   * @param {number} width
   * @param {number} padding
   */
  constructor(hrList, width, padding, withStaffImage) {
    this.hrList = hrList;
    this.width = width;
    this.padding = padding;
    this.height = 0;
    this.paths = [];
    this.withStaffImage = withStaffImage;
    this.measurer = new Measurer();
    this.loader = new Loader();
  }

  async addImagePath(pointer, src, width, height, errorBackGround, borderRadius) {
    let image = null;
    try {
      image = await this.loader.loadImage(src);
    } catch (e) {
      console.log('load image error, use default error color ');
    }
    this.paths.push({
      type: 'image',
      x: pointer.x,
      y: pointer.y,
      width,
      height,
      image,
      bgColor: errorBackGround,
      borderRadius
    });
  }

  addPureBoxPath(pointer, width, height, backgroundColor) {
    this.paths.push({
      type: 'rect',
      x: pointer.x,
      y: pointer.y,
      width,
      height,
      color: backgroundColor
    });
  }

  addPureTextBoxPath(
    pointer,
    text,
    fontSize,
    paddingHorizontal,
    boxHeight,
    boxColor,
    color,
    borderRadius = 0,
    doNotDraw
  ) {
    const { width, height } = this.measurer.text(text, fontSize);
    const boxWidth = width + paddingHorizontal * 2;
    const rectPath = {
      type: 'rect',
      x: pointer.x,
      y: pointer.y,
      height: boxHeight,
      width: boxWidth,
      color: boxColor,
      borderRadius
    };
    const textPath = {
      type: 'text',
      x: pointer.x + paddingHorizontal,
      y: pointer.y + (boxHeight - height) / 2,
      fontSize,
      color,
      content: text
    };
    if (!doNotDraw) {
      this.paths.push(rectPath);
      this.paths.push(textPath);
    }
    const resetXY = p => {
      rectPath.x = p.x;
      rectPath.y = p.y;
      textPath.x = p.x + paddingHorizontal;
      textPath.y = p.y + (boxHeight - height) / 2;
    };
    if (doNotDraw) {
      return { boxWidth, resetXY, rectPath, textPath };
    }
    return { boxWidth, resetXY };
  }

  async addImageTextBoxPath(
    pointer,
    imageSrc,
    imageMarginVertical,
    imageMarginRight,
    text,
    fontSize,
    paddingHorizontal,
    boxHeight,
    boxColor,
    imageErrorColor,
    color,
    imageBorderRadius,
    borderRadius = 0,
    doNotDraw
  ) {
    const { width, height } = this.measurer.text(text, fontSize);
    let image = null;
    try {
      image = await this.loader.loadImage(imageSrc);
    } catch (e) {
      console.log(e);
      console.log('image load error, use default error color');
    }
    const imageHeight = boxHeight - imageMarginVertical * 2;
    const imageWidth = image ? imageHeight * (image.width / image.height) : imageHeight;
    const boxWidth = imageWidth + imageMarginRight + width + paddingHorizontal * 2;
    const rectPath = {
      type: 'rect',
      x: pointer.x,
      y: pointer.y,
      height: boxHeight,
      width: boxWidth,
      color: boxColor,
      borderRadius
    };
    const imagePath = {
      type: 'image',
      x: pointer.x + paddingHorizontal,
      y: pointer.y + imageMarginVertical,
      height: imageHeight,
      width: imageWidth,
      bgColor: imageErrorColor,
      image,
      borderRadius: imageBorderRadius
    };
    const textPath = {
      type: 'text',
      x: pointer.x + paddingHorizontal + imageWidth + imageMarginRight,
      y: pointer.y + (boxHeight - height) / 2,
      fontSize,
      color,
      content: text
    };
    const resetXY = p => {
      rectPath.x = p.x;
      rectPath.y = p.y;
      imagePath.x = p.x + paddingHorizontal;
      imagePath.y = p.y + imageMarginVertical;
      textPath.x = p.x + paddingHorizontal + imageWidth + imageMarginRight;
      textPath.y = p.y + (boxHeight - height) / 2;
    };
    if (doNotDraw) {
      return { boxWidth, resetXY, rectPath, imagePath, textPath };
    }
    return { boxWidth, resetXY };
  }

  addTagTextBox(pointer, tag, boxHeight) {
    return this.addPureTextBoxPath(pointer, tag, 14, 10, boxHeight, '#6c757d', TEXT_COLOR.WHITE, 3);
  }

  getTagTextBox(pointer, tag, boxHeight) {
    return this.addPureTextBoxPath(pointer, tag, 14, 10, boxHeight, '#6c757d', TEXT_COLOR.WHITE, 3, true);
  }

  getStaffTextBox(pointer, staff, boxHeight, level) {
    return this.addPureTextBoxPath(
      pointer,
      staff.name,
      14,
      10,
      boxHeight,
      STAFF_LEVEL_BOX_COLOR_MAP[staff.level],
      STAFF_LEVEL_FONT_COLOR_MAP[staff.level],
      3,
      true
    );
  }

  getStaffImageTextBox(pointer, staff, boxHeight) {
    return this.addImageTextBoxPath(
      pointer,
      `./res/akhr-chara/${staff.enName}.png`,
      3,
      5,
      staff.name,
      14,
      10,
      boxHeight,
      STAFF_LEVEL_BOX_COLOR_MAP[staff.level],
      'white',
      STAFF_LEVEL_FONT_COLOR_MAP[staff.level],
      3,
      3,
      true
    );
  }

  addTitlePath() {
    const content = '识别词条:';
    const titleHeight = 20;
    this.paths.push({ type: 'text', x: 0, y: 0, fontSize: titleHeight, content, color: TEXT_COLOR.BLACK });
    this.height += this.measurer.text(content, titleHeight).height;
    this.height += 10; // marginTop
    const boxHeight = 35;
    const pointer = { x: 0, y: this.height };
    this.hrList.words.forEach(word => {
      const { boxWidth, resetXY } = this.addTagTextBox(pointer, word, boxHeight);
      if (pointer.x + boxWidth > this.width) {
        // 一行放不下, 自动换行
        pointer.x = 0;
        pointer.y += boxHeight;
        pointer.y += 10; // marginBottom
        this.height = pointer.y;
        resetXY(pointer);
      }
      pointer.x += boxWidth;
      pointer.x += 10; // marginRight
    });
    if (this.hrList.words.length) {
      this.height += boxHeight;
    }
  }

  getCombineTagsPath(startPointer, tags) {
    const tagsHeight = 35;
    return tags.reduce(
      (result, tag, index) => {
        const { rectPath, textPath } = this.getTagTextBox(startPointer, tag, tagsHeight);
        startPointer.y += tagsHeight;
        result.height += tagsHeight;
        startPointer.y += 10; // marginBottom
        if (index < tags.length - 1) {
          result.height += 10;
        }
        result.paths.push(rectPath);
        result.paths.push(textPath);
        return result;
      },
      { height: 0, paths: [] }
    );
  }

  async getStaffsPath(startPointer, maxWidth, staffs) {
    const boxHeight = this.withStaffImage ? 40 : 35;
    const paddingBottom = 10;
    let lineCount = 1;
    let width = 0;
    const startX = startPointer.x;
    const paths = await staffs.reduce(async (result, staff) => {
      result = await result;
      const getPathFunc = this[this.withStaffImage ? 'getStaffImageTextBox' : 'getStaffTextBox'];
      const { boxWidth, resetXY, rectPath, textPath, imagePath } = await getPathFunc.call(
        this,
        startPointer,
        staff,
        boxHeight
      );
      if (width + boxWidth > maxWidth) {
        // 一行放不下, 自动换行
        startPointer.x = startX;
        width = 0;
        startPointer.y += boxHeight;
        startPointer.y += paddingBottom; // marginBottom
        lineCount += 1; // 记录新的一行
        resetXY(startPointer);
      }
      startPointer.x += boxWidth;
      startPointer.x += 10; // marginRight
      width += boxWidth;
      width += 10;
      result.push(rectPath);
      if (this.withStaffImage) {
        result.push(imagePath);
      }
      result.push(textPath);
      return result;
    }, Promise.resolve([]));
    return {
      height: boxHeight * lineCount + paddingBottom * (lineCount - 1),
      paths
    };
  }

  async addRowPath({ tags, staffs }, index) {
    const rowPadding = 8;
    const tagsContainerMaxWidth = 120;
    const staffsMaxWidth = this.width - tagsContainerMaxWidth;
    const tagsStartPointer = { x: rowPadding, y: this.height + rowPadding };
    const staffsStartPointer = { x: tagsContainerMaxWidth, y: this.height + rowPadding };
    const { height: tagsHeight, paths: tagPaths } = this.getCombineTagsPath(tagsStartPointer, tags);
    const { height: staffsHeight, paths: staffPaths } = await this.getStaffsPath(
      staffsStartPointer,
      staffsMaxWidth,
      staffs,
      true
    );
    const maxHeight = Math.max(tagsHeight, staffsHeight) + rowPadding * 2;
    this.addPureBoxPath(
      { x: 0, y: this.height },
      this.width,
      maxHeight,
      index % 2 ? 'transparent' : 'rgba(0,0,0,.1)'
    );
    this.paths = this.paths.concat(tagPaths, staffPaths);
    this.height += maxHeight;
  }

  async addContentPath() {
    this.height += 10; // marginTop
    const { combined } = this.hrList;
    for (let index in combined) {
      await this.addRowPath(combined[index], index);
    }
  }

  async getPath() {
    this.addTitlePath();
    await this.addContentPath();
  }

  drawRadiusRect(x, y, width, height, borderRadius) {
    const r = borderRadius;
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + width - r, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    this.ctx.lineTo(x + width, y + height - r);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    this.ctx.lineTo(x + r, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  drawRect({ color, x, y, width, height, borderRadius }) {
    this.ctx.fillStyle = color;
    if (!borderRadius) {
      this.ctx.fillRect(x, y, width, height);
      return;
    }
    this.drawRadiusRect(x, y, width, height, borderRadius);
    this.ctx.fill();
  }

  drawImage({ x, y, width, height, image, bgColor = 'white', borderRadius }) {
    if (!image && bgColor) {
      this.drawRect({ color: bgColor, x, y, width, height, borderRadius });
      return;
    }
    if (borderRadius) {
      this.ctx.save();
      this.drawRadiusRect(x, y, width, height, borderRadius);
      this.ctx.clip();
      this.ctx.drawImage(image, x, y, width, height);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(image, x, y, width, height);
    }
  }

  drawText(path) {
    this.ctx.fillStyle = path.color;
    this.ctx.textBaseline = 'top';
    this.ctx.font = `${path.fontSize}px sans-serif`;
    this.ctx.fillText(path.content, path.x, path.y);
  }

  async draw() {
    await this.getPath();
    const dom = document.createElement('canvas');
    this.ctx = dom.getContext('2d');
    const domWidth = this.width + this.padding * 2;
    const domHeight = this.height + this.padding * 2;
    dom.style.width = domWidth;
    dom.style.height = domHeight;
    dom.width = domWidth;
    dom.height = domHeight;
    document.body.append(dom);

    this.ctx.fillStyle = '#ECEFF1';
    this.ctx.fillRect(0, 0, domWidth, domHeight);
    this.ctx.fill();

    const bgImage = await this.loader.loadImage(`./res/akhr-bg/${Math.floor(Math.random() * 70)}.png`);

    const imgWidth = Math.min(this.width, this.height) * 0.7;
    const imgHeigh = imgWidth * (bgImage.height / bgImage.width);
    this.drawImage({
      x: domWidth - imgWidth,
      y: domHeight - imgHeigh,
      width: imgWidth,
      height: imgHeigh,
      image: bgImage,
      bgColor: '#ECEFF1'
    });
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.fillRect(0, 0, domWidth, domHeight);
    this.ctx.fill();

    this.ctx.translate(this.padding, this.padding);
    this.paths.forEach(p => {
      switch (p.type) {
        case 'text':
          this.drawText(p);
          break;
        case 'rect':
          this.drawRect(p);
          break;
        case 'image':
          this.drawImage(p);
          break;
        default:
      }
    });
  }
}

const drawer = new AkhrDrawer(window.HR_RESULT, 1000, 10, true);
drawer.draw();
