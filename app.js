class WeightedQuickUnionUF {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, index) => index);
    this.treeSize = Array(size).fill(1);
  }

  find(node) {
    let current = node;
    while (current !== this.parent[current]) {
      this.parent[current] = this.parent[this.parent[current]];
      current = this.parent[current];
    }
    return current;
  }

  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) {
      return;
    }

    if (this.treeSize[rootA] < this.treeSize[rootB]) {
      this.parent[rootA] = rootB;
      this.treeSize[rootB] += this.treeSize[rootA];
    } else {
      this.parent[rootB] = rootA;
      this.treeSize[rootA] += this.treeSize[rootB];
    }
  }

  connected(a, b) {
    return this.find(a) === this.find(b);
  }
}

class PercolationModel {
  constructor(size) {
    this.size = size;
    this.openSites = 0;
    this.grid = Array.from({ length: size }, () => Array(size).fill(false));
    this.virtualTop = size * size;
    this.virtualBottom = size * size + 1;
    this.uf = new WeightedQuickUnionUF(size * size + 2);
    this.fullnessUf = new WeightedQuickUnionUF(size * size + 1);
  }

  index(row, col) {
    return row * this.size + col;
  }

  inBounds(row, col) {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  isOpen(row, col) {
    return this.grid[row][col];
  }

  isFull(row, col) {
    if (!this.isOpen(row, col)) {
      return false;
    }
    return this.fullnessUf.connected(this.index(row, col), this.virtualTop);
  }

  numberOfOpenSites() {
    return this.openSites;
  }

  percolates() {
    return this.uf.connected(this.virtualTop, this.virtualBottom);
  }

  connectIfOpen(row, col, neighborRow, neighborCol) {
    if (!this.inBounds(neighborRow, neighborCol) || !this.isOpen(neighborRow, neighborCol)) {
      return;
    }

    const current = this.index(row, col);
    const neighbor = this.index(neighborRow, neighborCol);
    this.uf.union(current, neighbor);
    this.fullnessUf.union(current, neighbor);
  }

  open(row, col) {
    if (!this.inBounds(row, col) || this.isOpen(row, col)) {
      return false;
    }

    this.grid[row][col] = true;
    this.openSites += 1;

    const current = this.index(row, col);
    if (row === 0) {
      this.uf.union(current, this.virtualTop);
      this.fullnessUf.union(current, this.virtualTop);
    }

    if (row === this.size - 1) {
      this.uf.union(current, this.virtualBottom);
    }

    this.connectIfOpen(row, col, row - 1, col);
    this.connectIfOpen(row, col, row + 1, col);
    this.connectIfOpen(row, col, row, col - 1);
    this.connectIfOpen(row, col, row, col + 1);
    return true;
  }

  openRandomBlockedSite() {
    const blocked = [];
    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        if (!this.isOpen(row, col)) {
          blocked.push([row, col]);
        }
      }
    }

    if (blocked.length === 0) {
      return false;
    }

    const [row, col] = blocked[Math.floor(Math.random() * blocked.length)];
    return this.open(row, col);
  }
}

const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll(".tab-panel");

const gridSizeInput = document.getElementById("grid-size");
const gridSizeValue = document.getElementById("grid-size-value");
const resetGridButton = document.getElementById("reset-grid");
const randomFillButton = document.getElementById("random-fill");
const openCount = document.getElementById("open-count");
const percolationStatus = document.getElementById("percolation-status");

const thresholdGridSizeInput = document.getElementById("threshold-grid-size");
const thresholdGridSizeValue = document.getElementById("threshold-grid-size-value");
const thresholdTrialsInput = document.getElementById("threshold-trials");
const thresholdTrialsValue = document.getElementById("threshold-trials-value");
const thresholdProgress = document.getElementById("threshold-progress");
const thresholdPreviewOpen = document.getElementById("threshold-preview-open");
const thresholdPreviewValue = document.getElementById("threshold-preview-value");
const resultMean = document.getElementById("result-mean");
const resultStddev = document.getElementById("result-stddev");
const resultLow = document.getElementById("result-low");
const resultHigh = document.getElementById("result-high");
const runThresholdButton = document.getElementById("run-threshold");
const rerunPreviewButton = document.getElementById("rerun-preview");

const canvas = document.getElementById("percolation-canvas");
const context = canvas.getContext("2d");
const thresholdCanvas = document.getElementById("threshold-canvas");
const thresholdContext = thresholdCanvas.getContext("2d");
const thresholdGraphCanvas = document.getElementById("threshold-graph");
const thresholdGraphContext = thresholdGraphCanvas.getContext("2d");

const COLORS = {
  blocked: "#050505",
  open: "#ffffff",
  full: "#65b5e4",
  line: "rgba(255, 255, 255, 0.18)"
};

let model = new PercolationModel(Number(gridSizeInput.value));
let pendingVisualizationDraw = null;
let pendingThresholdDraw = null;
let thresholdRunId = 0;
let lastThresholdSamples = [];
let lastThresholdMean = 0;
const hasThresholdUI = [
  thresholdGridSizeInput,
  thresholdGridSizeValue,
  thresholdTrialsInput,
  thresholdTrialsValue,
  thresholdProgress,
  thresholdPreviewOpen,
  thresholdPreviewValue,
  resultMean,
  resultStddev,
  resultLow,
  resultHigh,
  runThresholdButton,
  rerunPreviewButton,
  thresholdCanvas,
  thresholdContext,
  thresholdGraphCanvas,
  thresholdGraphContext
].every(Boolean);

function scheduleDraw(kind, drawFn) {
  if (kind === "visualization" && pendingVisualizationDraw !== null) {
    window.cancelAnimationFrame(pendingVisualizationDraw);
  }
  if (kind === "threshold" && pendingThresholdDraw !== null) {
    window.cancelAnimationFrame(pendingThresholdDraw);
  }

  const firstFrame = window.requestAnimationFrame(() => {
    const secondFrame = window.requestAnimationFrame(() => {
      if (kind === "visualization") {
        pendingVisualizationDraw = null;
      } else {
        pendingThresholdDraw = null;
      }
      drawFn();
    });

    if (kind === "visualization") {
      pendingVisualizationDraw = secondFrame;
    } else {
      pendingThresholdDraw = secondFrame;
    }
  });

  if (kind === "visualization") {
    pendingVisualizationDraw = firstFrame;
  } else {
    pendingThresholdDraw = firstFrame;
  }
}

function activateTab(targetId) {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === targetId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === targetId);
  });

  if (targetId === "visualization") {
    scheduleDraw("visualization", drawGrid);
  }

  if (targetId === "threshold") {
    if (hasThresholdUI) {
      scheduleDraw("threshold", drawThresholdPreview);
    }
  }
}

function resizeCanvasForDisplay(targetCanvas) {
  const displayWidth = targetCanvas.clientWidth;
  const scale = window.devicePixelRatio || 1;
  const nextWidth = Math.max(1, Math.round(displayWidth * scale));

  if (targetCanvas.width !== nextWidth || targetCanvas.height !== nextWidth) {
    targetCanvas.width = nextWidth;
    targetCanvas.height = nextWidth;
  }
}

function drawModel(targetCanvas, targetContext, sourceModel) {
  resizeCanvasForDisplay(targetCanvas);

  const size = sourceModel.size;
  const cellSize = targetCanvas.width / size;

  targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetContext.fillStyle = COLORS.blocked;
  targetContext.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (sourceModel.isFull(row, col)) {
        targetContext.fillStyle = COLORS.full;
      } else if (sourceModel.isOpen(row, col)) {
        targetContext.fillStyle = COLORS.open;
      } else {
        targetContext.fillStyle = COLORS.blocked;
      }

      const x = col * cellSize;
      const y = row * cellSize;
      targetContext.fillRect(x, y, cellSize, cellSize);
      targetContext.strokeStyle = COLORS.line;
      targetContext.lineWidth = Math.max(1, targetCanvas.width / 700);
      targetContext.strokeRect(x, y, cellSize, cellSize);
    }
  }
}

function updateStatus() {
  openCount.textContent = `${model.numberOfOpenSites()} open sites`;
  percolationStatus.textContent = model.percolates() ? "percolates" : "does not percolate";
}

function drawGrid() {
  drawModel(canvas, context, model);
  updateStatus();
}

function resetModel(size = Number(gridSizeInput.value)) {
  model = new PercolationModel(size);
  gridSizeValue.textContent = `${size} × ${size}`;
  drawGrid();
}

function openCellFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const col = Math.floor(x / (canvas.width / model.size));
  const row = Math.floor(y / (canvas.height / model.size));

  if (model.open(row, col)) {
    drawGrid();
  }
}

let thresholdPreviewModel = hasThresholdUI
  ? new PercolationModel(Number(thresholdGridSizeInput.value))
  : null;

function drawThresholdPreview() {
  if (!hasThresholdUI || !thresholdPreviewModel) {
    return;
  }
  drawModel(thresholdCanvas, thresholdContext, thresholdPreviewModel);
}

function updateThresholdOutputs(size, trials) {
  if (!hasThresholdUI) {
    return;
  }
  thresholdGridSizeValue.textContent = `${size} × ${size}`;
  thresholdTrialsValue.textContent = `${trials} trials`;
}

function performThresholdTrial(size) {
  const trialModel = new PercolationModel(size);
  while (!trialModel.percolates()) {
    trialModel.openRandomBlockedSite();
  }

  return {
    threshold: trialModel.numberOfOpenSites() / (size * size),
    openSites: trialModel.numberOfOpenSites(),
    model: trialModel
  };
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values, avg) {
  if (values.length <= 1) {
    return 0;
  }

  const variance = values.reduce((sum, value) => {
    const diff = value - avg;
    return sum + diff * diff;
  }, 0) / (values.length - 1);

  return Math.sqrt(variance);
}

function updateThresholdResults(avg, deviation, low, high) {
  if (!hasThresholdUI) {
    return;
  }
  resultMean.textContent = avg.toFixed(4);
  resultStddev.textContent = deviation.toFixed(4);
  resultLow.textContent = low.toFixed(4);
  resultHigh.textContent = high.toFixed(4);
}

function resizeGraphCanvas() {
  const displayWidth = thresholdGraphCanvas.clientWidth;
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(displayWidth * scale));
  const height = Math.round(width * 0.46);

  if (thresholdGraphCanvas.width !== width || thresholdGraphCanvas.height !== height) {
    thresholdGraphCanvas.width = width;
    thresholdGraphCanvas.height = height;
  }
}

function sampleCurveValue(x, threshold, sharpness) {
  return 1 / (1 + Math.exp(-(x - threshold) * sharpness));
}

function drawThresholdGraph(samples = lastThresholdSamples, meanValue = lastThresholdMean) {
  if (!hasThresholdUI) {
    return;
  }

  resizeGraphCanvas();
  const ctx = thresholdGraphContext;
  const width = thresholdGraphCanvas.width;
  const height = thresholdGraphCanvas.height;
  const axisFont = Math.max(18, Math.min(24, width / 48));
  const tickFont = axisFont;
  const labelFont = Math.max(10, Math.min(13, width / 82));
  const annotationFont = Math.max(15, Math.min(22, width / 52));
  const margin = { top: 16, right: 28, bottom: 84, left: 76 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffdf9";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(23, 23, 23, 0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + (plotHeight * i) / 4;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();
  }

  for (let i = 0; i <= 5; i += 1) {
    const x = margin.left + (plotWidth * i) / 5;
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, height - margin.bottom);
    ctx.stroke();
  }

  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.lineTo(width - margin.right, height - margin.bottom);
  ctx.stroke();

  ctx.fillStyle = "#3f3a34";
  ctx.font = `700 ${axisFont}px Avenir Next`;
  ctx.textAlign = "center";
  ctx.fillText("open-site fraction p", margin.left + plotWidth / 2, height - 20);

  ctx.save();
  ctx.translate(28, margin.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("P(percolates)", 0, 0);
  ctx.restore();

  ctx.textAlign = "right";
  ctx.fillText("0", margin.left - 16, height - margin.bottom + 4);
  ctx.fillText("1", margin.left - 10, margin.top + 4);

  ctx.textAlign = "center";
  ctx.font = `${tickFont}px Menlo`;
  for (let i = 0; i <= 5; i += 1) {
    const x = margin.left + (plotWidth * i) / 5;
    const labelX = i === 0
      ? x + 16
      : i === 5
        ? x - 16
        : x;
    ctx.fillText((i / 5).toFixed(1), labelX, height - margin.bottom + 28);
  }

  if (!samples.length) {
    ctx.fillStyle = "#7a746b";
    ctx.font = `${axisFont}px Avenir Next`;
    ctx.fillText("Run the simulation to generate the threshold graph.", margin.left + plotWidth / 2, margin.top + plotHeight / 2);
    return;
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const showcased = sorted.slice(0, Math.min(8, sorted.length));

  showcased.forEach((threshold, index) => {
    const sharpness = 28 + index * 2.5;
    ctx.strokeStyle = "rgba(30, 91, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let step = 0; step <= 140; step += 1) {
      const p = step / 140;
      const yValue = sampleCurveValue(p, threshold, sharpness);
      const x = margin.left + p * plotWidth;
      const y = margin.top + (1 - yValue) * plotHeight;
      if (step === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  });

  ctx.strokeStyle = "#1e5bff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let step = 0; step <= 180; step += 1) {
    const p = step / 180;
    const yValue = sorted.filter((value) => value <= p).length / sorted.length;
    const x = margin.left + p * plotWidth;
    const y = margin.top + (1 - yValue) * plotHeight;
    if (step === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  const thresholdX = margin.left + meanValue * plotWidth;
  ctx.strokeStyle = "#df4b38";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(thresholdX, margin.top);
  ctx.lineTo(thresholdX, height - margin.bottom);
  ctx.stroke();

  ctx.fillStyle = "#df4b38";
  ctx.beginPath();
  ctx.arc(thresholdX, margin.top + plotHeight * 0.16, 5.5, 0, Math.PI * 2);
  ctx.fill();

  const annotationText = `p* ≈ ${meanValue.toFixed(4)}`;
  ctx.font = `700 ${annotationFont}px Menlo`;
  const annotationWidth = ctx.measureText(annotationText).width;
  const annotationX = Math.min(Math.max(thresholdX + 12, margin.left + 6), width - margin.right - annotationWidth - 8);
  const annotationY = margin.top + 18;

  ctx.fillStyle = "rgba(255, 253, 249, 0.9)";
  ctx.fillRect(annotationX - 6, annotationY - annotationFont + 1, annotationWidth + 12, annotationFont + 10);

  ctx.fillStyle = "#df4b38";
  ctx.textAlign = "left";
  ctx.font = `700 ${annotationFont}px Menlo`;
  ctx.fillText(annotationText, annotationX, annotationY);
}

async function runThresholdSimulation(trials, size) {
  if (!hasThresholdUI) {
    return;
  }
  thresholdRunId += 1;
  const runId = thresholdRunId;
  runThresholdButton.disabled = true;
  rerunPreviewButton.disabled = true;
  thresholdProgress.textContent = `Running ${trials} trials on a ${size} × ${size} grid...`;

  const thresholds = [];

  for (let trialIndex = 0; trialIndex < trials; trialIndex += 1) {
    if (runId !== thresholdRunId) {
      return;
    }

    const trial = performThresholdTrial(size);
    thresholds.push(trial.threshold);
    thresholdPreviewModel = trial.model;
    thresholdPreviewOpen.textContent = `${trial.openSites} open sites`;
    thresholdPreviewValue.textContent = `threshold ${trial.threshold.toFixed(4)}`;
    drawThresholdPreview();
    thresholdProgress.textContent = `Completed ${trialIndex + 1} of ${trials} trials...`;

    if ((trialIndex + 1) % 5 === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  const avg = mean(thresholds);
  const deviation = stddev(thresholds, avg);
  const margin = 1.96 * deviation / Math.sqrt(trials);
  lastThresholdSamples = thresholds;
  lastThresholdMean = avg;

  updateThresholdResults(avg, deviation, avg - margin, avg + margin);
  drawThresholdGraph();
  thresholdProgress.textContent = `Finished ${trials} trials.`;
  runThresholdButton.disabled = false;
  rerunPreviewButton.disabled = false;
}

function runSinglePreviewTrial(size) {
  if (!hasThresholdUI) {
    return;
  }
  const trial = performThresholdTrial(size);
  thresholdPreviewModel = trial.model;
  thresholdPreviewOpen.textContent = `${trial.openSites} open sites`;
  thresholdPreviewValue.textContent = `threshold ${trial.threshold.toFixed(4)}`;
  drawThresholdPreview();
  thresholdProgress.textContent = "Preview updated from one trial.";
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tabTarget);
  });
});

gridSizeInput.addEventListener("input", () => {
  gridSizeValue.textContent = `${gridSizeInput.value} × ${gridSizeInput.value}`;
});

gridSizeInput.addEventListener("change", () => {
  resetModel(Number(gridSizeInput.value));
});

resetGridButton.addEventListener("click", () => {
  resetModel();
});

randomFillButton.addEventListener("click", () => {
  if (model.openRandomBlockedSite()) {
    drawGrid();
  }
});

canvas.addEventListener("click", openCellFromPointer);

if (hasThresholdUI) {
  thresholdGridSizeInput.addEventListener("input", () => {
    updateThresholdOutputs(Number(thresholdGridSizeInput.value), Number(thresholdTrialsInput.value));
  });

  thresholdTrialsInput.addEventListener("input", () => {
    updateThresholdOutputs(Number(thresholdGridSizeInput.value), Number(thresholdTrialsInput.value));
  });

  thresholdGridSizeInput.addEventListener("change", () => {
    const size = Number(thresholdGridSizeInput.value);
    thresholdPreviewModel = new PercolationModel(size);
    thresholdPreviewOpen.textContent = "0 open sites";
    thresholdPreviewValue.textContent = "threshold 0.0000";
    scheduleDraw("threshold", drawThresholdPreview);
  });

  runThresholdButton.addEventListener("click", () => {
    runThresholdSimulation(Number(thresholdTrialsInput.value), Number(thresholdGridSizeInput.value));
  });

  rerunPreviewButton.addEventListener("click", () => {
    runSinglePreviewTrial(Number(thresholdGridSizeInput.value));
  });
}

window.addEventListener("resize", () => {
  if (document.getElementById("visualization").classList.contains("active")) {
    drawGrid();
  }
  if (hasThresholdUI && document.getElementById("threshold").classList.contains("active")) {
    drawThresholdPreview();
    drawThresholdGraph();
  }
});

window.addEventListener("load", () => {
  activateTab("home");
  resetModel(Number(gridSizeInput.value));
  if (hasThresholdUI) {
    updateThresholdOutputs(Number(thresholdGridSizeInput.value), Number(thresholdTrialsInput.value));
    thresholdPreviewModel = new PercolationModel(Number(thresholdGridSizeInput.value));
    drawThresholdPreview();
    drawThresholdGraph();
  }
});
