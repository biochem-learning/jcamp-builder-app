function findPeaks(samples, prominence = null) {
  if (!Array.isArray(samples) &&
      !(ArrayBuffer.isView(samples) && !(samples instanceof DataView))) {
    throw new TypeError("Spectrum must be an array of finite numbers.");
  }
  for (const value of samples) {
    if (!Number.isFinite(value)) {
      throw new TypeError("Spectrum must contain only finite numbers.");
    }
  }
  if (prominence !== null && !Number.isFinite(prominence)) {
    throw new TypeError("Prominence must be a finite number or null.");
  }

  const peaks = [];
  let start = 1;
  while (start < samples.length - 1) {
    const height = samples[start];
    let end = start;
    while (end + 1 < samples.length && samples[end + 1] === height) end++;
    if (samples[start - 1] < height && samples[end + 1] < height) {
      const peak = Math.floor((start + end) / 2);
      if (prominence === null) {
        peaks.push(peak);
      } else {
        let leftValley = height;
        let rightValley = height;
        for (let i = start - 1; i >= 0 && samples[i] <= height; i--) {
          leftValley = Math.min(leftValley, samples[i]);
        }
        for (let i = end + 1; i < samples.length && samples[i] <= height; i++) {
          rightValley = Math.min(rightValley, samples[i]);
        }
        if (height - Math.max(leftValley, rightValley) >= prominence) {
          peaks.push(peak);
        }
      }
    }
    start = end + 1;
  }
  return peaks;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { findPeaks };
}
