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

function loadImage() {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.src = `./ark-img/${Math.floor(Math.random() * 70)}.png`;
  });
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
  constructor(hrList, width, padding) {
    this.hrList = hrList;
    this.width = width;
    this.padding = padding;
    this.height = 0;
    this.paths = [];
    this.measurer = new Measurer();
  }

  addPureBoxPath(pointer, width, height, backgroundColor) {
    this.paths.push({
      x: pointer.x,
      y: pointer.y,
      type: 'rect',
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

  addTagTextBox(pointer, tag, boxHeight) {
    return this.addPureTextBoxPath(pointer, tag, 14, 10, boxHeight, '#6c757d', TEXT_COLOR.WHITE, 3);
  }

  getTagTextBox(pointer, tag, boxHeight) {
    return this.addPureTextBoxPath(pointer, tag, 14, 10, boxHeight, '#6c757d', TEXT_COLOR.WHITE, 3, true);
  }

  getStaffTextBox(pointer, name, boxHeight, level) {
    return this.addPureTextBoxPath(
      pointer,
      name,
      14,
      10,
      boxHeight,
      STAFF_LEVEL_BOX_COLOR_MAP[level],
      STAFF_LEVEL_FONT_COLOR_MAP[level],
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

  getStaffsPath(startPointer, maxWidth, staffs) {
    const boxHeight = 35;
    const paddingBottom = 10;
    let lineCount = 1;
    let width = 0;
    const startX = startPointer.x;
    const paths = staffs.reduce((result, staff) => {
      const { name, level } = staff;
      const { boxWidth, resetXY, rectPath, textPath } = this.getStaffTextBox(
        startPointer,
        name,
        boxHeight,
        level
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
      result.push(textPath);
      return result;
    }, []);
    return {
      height: boxHeight * lineCount + paddingBottom * (lineCount - 1),
      paths
    };
  }

  addRowPath({ tags, staffs }, index) {
    const rowPadding = 8;
    const tagsContainerMaxWidth = 120;
    const staffsMaxWidth = this.width - tagsContainerMaxWidth;
    const tagsStartPointer = { x: rowPadding, y: this.height + rowPadding };
    const staffsStartPointer = { x: tagsContainerMaxWidth, y: this.height + rowPadding };
    const { height: tagsHeight, paths: tagPaths } = this.getCombineTagsPath(tagsStartPointer, tags);
    const { height: staffsHeight, paths: staffPaths } = this.getStaffsPath(
      staffsStartPointer,
      staffsMaxWidth,
      staffs
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

  addContentPath() {
    this.height += 10; // marginTop
    this.hrList.combined.forEach(this.addRowPath.bind(this));
  }

  getPath() {
    this.addTitlePath();
    this.addContentPath();
  }

  drawRect({ color, x, y, width, height, borderRadius: r }) {
    this.ctx.fillStyle = color;
    if (!r) {
      this.ctx.fillRect(x, y, width, height);
      return;
    }
    this.ctx.beginPath();
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
    this.ctx.fill();
  }

  drawText(path) {
    this.ctx.fillStyle = path.color;
    this.ctx.textBaseline = 'top';
    this.ctx.font = `${path.fontSize}px sans-serif`;
    this.ctx.fillText(path.content, path.x, path.y);
  }

  async draw() {
    this.getPath();
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
    
    const img = await loadImage();
    const imgWidth = 300;
    const imgHeigh = 300 * (img.height / img.width);
    this.ctx.drawImage(img, domWidth - imgWidth, domHeight - imgHeigh, imgWidth, imgHeigh);

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
        default:
      }
    });
  }
}

const drawer = new AkhrDrawer(window.HR_RESULT, 500, 10);
drawer.draw();
