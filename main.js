/// Add a cache dictionary with key = jcamp1, assignments, jcamp2 and values = merged jacmp of such values
/// Before making a merge request, check the dictionary if the merged jcamp is available

/// When click identify peaks, return the merge jcamp and store it in cache


/// Add a variable to keep track which assignment is selected
/// An assignment is selected should have the div color change and the border highlight (1px?)
/// change all the border to 2/3px
/// when user work on an assignment, update the assigment var and change the color appropriately

///Important: Use Chemdoodle get mol/spec to identify peaks instead of RDKit

const endPoint = "https://jcamp-builder-api.onrender.com";

function getDivAndParentEl(divSelector) {
    let div = document.querySelector(divSelector);

    if (!div) {
        console.error(`Element with selector "${divSelector}" not found.`);
        return null;
    }

    let parent = div.parentNode;
    
    if (!parent) {
        console.error(`Element with selector "${divSelector}" has no parent.`);
        return null;
    }

    return {
        element: div,
        parent: parent

    };
}

function percentage(divSelector, percentage, dimension) {
    let divAndParent = getDivAndParentEl(divSelector)

    if (!divAndParent) {
        return
    }

    let parent = divAndParent.parent;

    parentDimension = (dimension === "width") ? parent.offsetWidth : parent.offsetHeight 
    caculatedDimension = parentDimension * percentage / 100;

    return caculatedDimension
}

function displayOrHideElement(elementSelector) {
    const element = document.querySelector(elementSelector);

    if (!element) {
        console.error(`Element with selector "${elementSelector}" not found.`);
        return;
    }

    const isVisible = window.getComputedStyle(element).display !== "none";
    element.style.display = isVisible ? "none" : "block";
}

// const exitBtn = document.querySelector("#exit-peak-id");
// exitBtn.addEventListener("click", () => {
//     displayOrHideElement(".overlay")
// });

const specFileInput = document.getElementById("spec-file-reader");
const strucFileInput = document.getElementById("struc-file-reader");

let specFileContent;
let spectrumMap;
let strucFileContent;

let builtJcamp;
let strucCanvas;
let specCanvas;

specFileInput.addEventListener("change", function (event) {
  handleFileSelection(event, (content) => {
    removeCanvas("spec_spectrum")
    specCanvas = null;
    specFileContent = content;
    // try {
    //   let spectrum = ChemDoodle.readJCAMP(content)
    // }
    // catch (e) {
    //   alert("Invalid spectrum file, please try again")
    // }
    let spectrum = ChemDoodle.readJCAMP(content)
    spectrumMap = constructSpectrumMap(spectrum)

    console.log(spectrumMap)
    
    specCanvas = null;
    specCanvas = new ChemDoodle.io.JCAMPInterpreter().makeStructureSpectrumSet(
        'spec', 
        specFileContent, 
        0,
        0,
        percentage('#spec_spectrum',65,"width"), 
        percentage('#spec_spectrum',100,"height")
    )
  });
});

strucFileInput.addEventListener("change", function (event) {
  handleFileSelection(event, (content) => {
    removeCanvas("struc_molecule")
    strucCanvas = null;
    strucFileContent = content;

    strucCanvas = new ChemDoodle.io.JCAMPInterpreter().makeStructureSpectrumSet(
        'struc', 
        strucFileContent, 
        percentage('#struc_molecule',50, "width"), 
        percentage('#struc_molecule',100, "height"),
        0, 
        0,
    )
    console.log(strucCanvas)
    strucCanvas[0].repaint()
  });
});

function removeCanvas(canvasId) {
	let canvasAndParent = getDivAndParentEl("#" + canvasId);

    if (!canvasAndParent) {
        return
    }

    let canvas = canvasAndParent.element;
    let parent = canvasAndParent.parent;
    let newCanvas = document.createElement("canvas");
    
    newCanvas.id = canvasId;

	parent.replaceChild(newCanvas, canvas);
}

function handleFileSelection(event, callback) {
  const file = event.target.files[0];
  if (!file) {
    console.error("No file selected.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    callback(reader.result);
  };
  reader.onerror = () => {
    console.error("Error reading the file.");
  };
  reader.readAsText(file);
}

let numAssignments = 0;
let selectedAssignment = null;

function selectAssignment(div) {
  if (selectedAssignment) {
    selectedAssignment.style.backgroundColor = '#DAD6EB';
  }

  div.style.backgroundColor = '#c4b9f4';
  selectedAssignment = div;
}

function createAssignments(x = "", y = "" , atomAssignment="") {
  numAssignments += 1;

  const wrapper = document.createElement("div");
  wrapper.className = "assignments-wrapper";
  wrapper.style.backgroundColor = '#c4b9f4';

  if (selectedAssignment) {
    selectedAssignment.style.backgroundColor = '#DAD6EB';
  }
  selectedAssignment = wrapper;

  wrapper.addEventListener("click", () => selectAssignment(wrapper));

  const xDiv = document.createElement("div");
  xDiv.className = "assignments";
  xDiv.innerHTML = 'X: <input class="assign-input file-reader struc-file-reader-x" type="text"/>';
  if (x !== "") {
    xDiv.querySelector("input").value = x;
  }

  const yDiv = document.createElement("div");
  yDiv.className = "assignments";
  yDiv.innerHTML = 'Y: <input class="assign-input file-reader struc-file-reader-y" type="text"/>';
  if (y !== "") {
    yDiv.querySelector("input").value = y;
  }

  const atomDiv = document.createElement("div");
  atomDiv.className = "assignments atom-assignment";
  atomDiv.innerHTML = 'Atom IDs: <input class="assign-input file-reader atom-assign-input" type="text"/>';
  if (atomAssignment !== "") {
    atomDiv.querySelector("input").value = atomAssignment;
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-assign";
  deleteBtn.textContent = "X";
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation(); 
    wrapper.remove();
    numAssignments -= 1;
    if (selectedAssignment === wrapper) selectedAssignment = null;
  });

  wrapper.appendChild(xDiv);
  wrapper.appendChild(yDiv);
  wrapper.appendChild(atomDiv);
  wrapper.appendChild(deleteBtn);

  document.querySelector(".right-section").appendChild(wrapper);
  console.log(numAssignments)
}

addAssignmentsBtn = document.querySelector("#add-assign-btn")
addAssignmentsBtn.addEventListener("click", () => createAssignments())

function createMDAssignments() {
  const metadataDiv = document.createElement("div");
  metadataDiv.className = "metadata";
  metadataDiv.innerHTML = '<input class="label" type="text"/>: <input class="metadata-input" type="text"/>';
  document.querySelector("#user-input-section").appendChild(metadataDiv);
}

addAssignmentsBtn = document.querySelector("#add-md-assign-btn")
addAssignmentsBtn.addEventListener("click", () => createMDAssignments())

// Displays a message to the user
// function showMessage(message, type) {
//   messageDisplay.textContent = message;
//   messageDisplay.style.color = type === "error" ? "red" : "green";
// }

async function buildJcamp(metadatas, specJcamp, strucJcamp, assignments) {
    if (!strucJcamp) {
      throw new Error("Invalid Structure JCAMP file.");
    }
    if (!specJcamp) {
      throw new Error("Invalid Spectral JCAMP file.");
    }

    const response = await fetch(endPoint + "/build_jcamp", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        metadatas: metadatas,
        specJcamp: specJcamp,
        strucJcamp: strucJcamp,
        assignments: assignments
    })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const built_jcamp = await response.text(); 
    return built_jcamp;
}

mergeBtn = document.querySelector("#merge-btn")
mergeBtn.addEventListener("click", async function() {
    try {
      let assignments = getAssignments() ////Array of array
      for (let i = 0; i < assignments.length; i++) {
        const [xVal, yVal] = assignments[i];
        if (isNaN(yVal)) {
          throw new Error(
            `Invalid Y value in assignment #${i + 1}: "${yVal}" - must be a valid number.`
          );
        }
      }

      let metadatas = getMetadatas()
      builtJcamp = await buildJcamp(metadatas, specFileContent, strucFileContent, assignments) 
      
      displayOrHideElement(".overlay")
      displayOrHideElement("#downloadable-content") 

      previewArea = document.querySelector(".preview-area")
      previewArea.value = builtJcamp
    }
    catch(e) {
      alert(e)
    }
})

/// Add an error flagging if the assigned atoms are out of available atom range
function getAssignments() {
  const wrappers = document.querySelectorAll(".assignments-wrapper");
  const resultMap = new Map();

  const floatRegex = /^-?\d+(\.\d+)?$/;
  const intRegex = /^-?\d+$/;

  wrappers.forEach((wrapper, idx) => {
    const xVal = wrapper.querySelector(".struc-file-reader-x")?.value.trim() || "";
    const yVal = wrapper.querySelector(".struc-file-reader-y")?.value.trim() || "";
    const atomStr = wrapper.querySelector(".atom-assign-input")?.value.trim() || "";

    if (!xVal && !yVal && !atomStr) return;

    if (/\s+/.test(xVal)) {
      throw new Error(`Invalid X in assignment #${idx + 1}: only one number allowed.`);
    }
    if (/\s+/.test(yVal)) {
      throw new Error(`Invalid Y in assignment #${idx + 1}: only one number allowed.`);
    }

    if (!floatRegex.test(xVal)) {
      throw new Error(`Invalid X value in assignment #${idx + 1}: "${xVal}" - must be a valid number.`);
    }
    if (yVal !== "" && !floatRegex.test(yVal)) {
      throw new Error(`Invalid Y value in assignment #${idx + 1}: "${yVal}" - must be a valid number.`);
    }

    const x = parseFloat(xVal);
    const y = parseFloat(yVal);

    let atoms = [];
    if (atomStr) {
      atoms = atomStr
        .split(/[\s,]+/)
        .map(a => a.trim())
        .filter(Boolean)
        .map(a => {
          if (!intRegex.test(a)) {
            throw new Error(`Invalid atom ID "${a}" in assignment #${idx + 1}: must be an integer.`);
          }
          return parseInt(a, 10);
        });
      atoms = [...new Set(atoms)];
    }

    for (let [key, value] of resultMap.entries()) {
      const [existingX, existingY, existingAtoms] = value;

      if (existingX === x && existingY !== y) {
        throw new Error(
          `Conflict: Duplicate X value "${x}" found with different Y values ("${existingY}" vs "${y}").`
        );
      }

      if (existingX === x && existingY === y) {
        const merged = [...new Set([...existingAtoms, ...atoms])];
        resultMap.set(key, [x, y, merged]);
        return;
      }
    }

    resultMap.set(idx, [x, y, atoms]);
  });

  return Array.from(resultMap.values());
}

function getMetadatas() {
  const metadataDivs = document.querySelectorAll("#user-input-section .metadata");
  const metadataDict = {};

  metadataDivs.forEach(metadata => {
    const input = metadata.querySelector(".metadata-input");
    const labelEl = metadata.querySelector(".label");

    if (!input || !labelEl) return;

    let label;

    // Case 1: label is an input (user-created)
    if (labelEl.tagName.toLowerCase() === "input") {
      label = labelEl.value.trim();
    } 
    // Case 2: label is <p>
    else {
      label = labelEl.textContent.replace(":", "").trim();
    }

    if (!label) return;

    metadataDict[label] = input.value.trim();
  });

  return metadataDict;
}

function download_jdx(filename = 'merged.jdx') {
    const previewArea = document.querySelector(".preview-area");
    const mergedJcamp = previewArea.value;

    const blob = new Blob([mergedJcamp], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename + ".jdx";
    link.click();
    URL.revokeObjectURL(link.href);
}

const downloadBtn = document.querySelector(".download-btn");
downloadBtn.addEventListener("click", () => {
    const wrapper = document.querySelector(".file-name");
    const fileName = wrapper.querySelector(".file-name-input")?.value.trim()
    download_jdx(fileName);
});

const overlay = document.querySelector(".overlay");
overlay.addEventListener("click", function () {
    displayOrHideElement(".overlay")
    displayOrHideElement("#downloadable-content") 
});

let prominenceInput = document.querySelector("#prominence-input")
prominenceInput.addEventListener("click", (e) => e.stopPropagation());

prominenceInput.addEventListener("keydown", e => e.stopPropagation());
prominenceInput.addEventListener("keyup", e => e.stopPropagation());
prominenceInput.addEventListener("keypress", e => e.stopPropagation());



const autoIdBtn = document.querySelector("#auto-id");

autoIdBtn.addEventListener("click", async () => {
  try {
    if (!spectrumMap || !(spectrumMap instanceof Map) || spectrumMap.size === 0) {
      throw new Error("Invalid spectrum file");
    }

    const promInput = document.querySelector("#prominence-input")?.value.trim();
    const prominence = promInput === "" ? null : Number(promInput);

    if (isNaN(prominence)) {
      throw new Error("Invalid prominence value — must be a number.");
    }

    document.querySelectorAll('.assignments-wrapper').forEach(el => el.remove());
    numAssignments = 0;

    const xValues = Array.from(spectrumMap.keys());
    const yValues = Array.from(spectrumMap.values());

    const peaks = await findPeaks(yValues, prominence);

    const points = peaks.map(i => ({
      x: xValues[i],
      y: yValues[i]
    }));

    console.log(points);

    points.forEach(p => {
      createAssignments(p.x.toFixed(4), p.y.toFixed(4));
    });

  } catch (e) {
    alert(e.message || e);
  }
});

async function findPeaks(array, prominence) {
  const response = await fetch(endPoint + "/find_peak", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ array, prominence })
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const { peaks } = await response.json();
  return peaks;
}

function getYCoorFromX(xCoors, spectrumMap){ /// xCoor is expected to be an array
    const yCoors = [];
    
    if (!xCoors || !spectrumMap) {
      return yCoors
    }

    for (let i = 0; i < xCoors.length; i += 1) {
      const yCoor = getClosestValues(spectrumMap, xCoors[i]) /// Need to somehow find the nearest peak to the xCoor
      yCoors.push(yCoor)
    }
    return yCoors;
}

function constructSpectrumMap(spectrum) {
  const map = new Map();
  
  if (spectrum.data.length == 0 || !spectrum) {
    return map
  }

  for (let i = 0; i < spectrum.data.length; i += 1) {
    map.set(spectrum.data[i].x,spectrum.data[i].y)
  }

  return map;
}

function getClosestValues(map, searchKey) {
  const keys = [...map.keys()];

  if (keys.length === 0) return null;

  const minKey = Math.min(...keys);
  const maxKey = Math.max(...keys);

  if (searchKey < minKey || searchKey > maxKey) return null;

  const closest = keys.reduce((a, b) =>
    Math.abs(b - searchKey) < Math.abs(a - searchKey) ? b : a
  );

  return map.get(closest);
}

const idFromXBtn = document.querySelector("#from-x-id");
idFromXBtn.addEventListener("click", () => {
  try {
    const assignments = getAssignments();
    if (!assignments || !Array.isArray(assignments)) {
      throw new Error("Invalid assignments");
    }

    if (!spectrumMap) {
      throw new Error("Invalid spectrum file");
    }

    const missingY = [];

    for (let i = 0; i < assignments.length; i++) {
      const [x, y] = assignments[i];
      if (isNaN(y)) {
        missingY.push({ idx: i, x });
      }
    }

    const xList = missingY.map(e => e.x);
    const yCoors = getYCoorFromX(xList, spectrumMap);

    const yInputs = document.querySelectorAll(".struc-file-reader-y");

    missingY.forEach((item, i) => {
      if (yInputs[item.idx]) {
        yInputs[item.idx].value = yCoors[i].toFixed(4);
      }
    });
  } catch (e) {
    alert(e.message || e);
  }
});


// def find_peaks(
//     x, 
//     height=None, 
//     threshold=None, 
//     distance=None, 
//     prominence=None, 
//     width=None, 
//     wlen=None, 
//     rel_height=0.5, 
//     plateau_size=None
// ):
//     """
//     Find peaks inside a signal based on peak properties.

//     This function takes a 1-D array and finds all local maxima by 
//     simple comparison of neighboring values. Optionally, a subset 
//     of these peaks can be selected by specifying conditions for a peak's properties.

//     Parameters
//     ----------
//     x : sequence
//         A signal with peaks.
//     height : number or ndarray or sequence, optional
//         Required height of peaks. Either a number, None, an array matching x, 
//         or a 2-element sequence of the former. The first element is interpreted
//         as the minimal and the second as the maximal required height.
//     threshold : number or ndarray or sequence, optional
//         Required threshold of peaks, the vertical distance to its neighboring samples.
//         Either a number, None, an array matching x, or a 2-element sequence of the former.
//     distance : number, optional
//         Required minimal horizontal distance (>= 1) in samples between neighbouring peaks.
//         Smaller peaks are removed first until the condition is fulfilled for all remaining peaks.
//     prominence : number or ndarray or sequence, optional
//         Required prominence of peaks. Either a number, None, an array matching x, 
//         or a 2-element sequence of the former.
//     width : number or ndarray or sequence, optional
//         Required width of peaks in samples.
//     wlen : int, optional
//         Used for calculation of the peaks prominences; only used if prominence or width is given.
//     rel_height : float, optional
//         Used for calculation of the peaks width; only used if width is given.
//     plateau_size : number or ndarray or sequence, optional
//         Required size of the flat top of peaks in samples.

//     Returns
//     -------
//     peaks : ndarray
//         Indices of peaks in x that satisfy all given conditions.
//     properties : dict
//         Dictionary containing properties of the returned peaks.
//     """

//     # Ensure input is the correct type
//     x = _arg_x_as_expected(x)

//     if distance is not None and distance < 1:
//         raise ValueError('distance must be greater or equal to 1')

//     # Find all local maxima
//     peaks, left_edges, right_edges = _local_maxima_1d(x)
//     properties = {}

//     # Evaluate plateau size
//     if plateau_size is not None:
//         plateau_sizes = right_edges - left_edges + 1
//         pmin, pmax = _unpack_condition_args(plateau_size, x, peaks)
//         keep = _select_by_property(plateau_sizes, pmin, pmax)
//         peaks = peaks[keep]
//         properties["plateau_sizes"] = plateau_sizes
//         properties["left_edges"] = left_edges
//         properties["right_edges"] = right_edges
//         properties = {key: array[keep] for key, array in properties.items()}

//     # Evaluate height condition
//     if height is not None:
//         peak_heights = x[peaks]
//         hmin, hmax = _unpack_condition_args(height, x, peaks)
//         keep = _select_by_property(peak_heights, hmin, hmax)
//         peaks = peaks[keep]
//         properties["peak_heights"] = peak_heights
//         properties = {key: array[keep] for key, array in properties.items()}

//     # Evaluate threshold condition
//     if threshold is not None:
//         tmin, tmax = _unpack_condition_args(threshold, x, peaks)
//         keep, left_thresholds, right_thresholds = _select_by_peak_threshold(x, peaks, tmin, tmax)
//         peaks = peaks[keep]
//         properties["left_thresholds"] = left_thresholds
//         properties["right_thresholds"] = right_thresholds
//         properties = {key: array[keep] for key, array in properties.items()}

//     # Evaluate distance condition
//     if distance is not None:
//         keep = _select_by_peak_distance(peaks, x[peaks], distance)
//         peaks = peaks[keep]
//         properties = {key: array[keep] for key, array in properties.items()}

//     # Calculate prominence and width if required
//     if prominence is not None or width is not None:
//         wlen = _arg_wlen_as_expected(wlen)
//         properties.update(zip(
//             ['prominences', 'left_bases', 'right_bases'],
//             _peak_prominences(x, peaks, wlen=wlen)
//         ))

//     # Evaluate prominence condition
//     if prominence is not None:
//         pmin, pmax = _unpack_condition_args(prominence, x, peaks)
//         keep = _select_by_property(properties['prominences'], pmin, pmax)
//         peaks = peaks[keep]
//         properties = {key: array[keep] for key, array in properties.items()}

//     # Calculate and evaluate width condition
//     if width is not None:
//         properties.update(zip(
//             ['widths', 'width_heights', 'left_ips', 'right_ips'],
//             _peak_widths(x, peaks, rel_height, properties['prominences'],
//                          properties['left_bases'], properties['right_bases'])
//         ))
//         wmin, wmax = _unpack_condition_args(width, x, peaks)
//         keep = _select_by_property(properties['widths'], wmin, wmax)
//         peaks = peaks[keep]
//         properties = {key: array[keep] for key, array in properties.items()}

//     return peaks, properties

/// Manual inplementation of find peaks
// function findPeaks(x, options = {}) {
//     const {
//         height = null,       // min peak height or [min, max]
//         distance = 1,        // min distance between peaks
//         prominence = null,   // min prominence
//         width = null,        // min width (optional)
//         plateauSize = null   // min plateau size
//     } = options;

//     if (!Array.isArray(x)) throw new Error("x must be an array");
//     if (x.length < 2) return { peaks: [], properties: {} };
//     if (distance < 1) throw new Error("distance must be >= 1");

//     // --- Step 1: find all local maxima including plateaus ---
//     let peaks = [];
//     let leftEdges = [];
//     let rightEdges = [];

//     for (let i = 0; i < x.length; i++) {
//         const left = i === 0 ? -Infinity : x[i - 1];
//         const right = i === x.length - 1 ? -Infinity : x[i + 1];

//         if (x[i] > left && x[i] >= right) {
//             peaks.push(i);

//             // plateau handling
//             let l = i, r = i;
//             while (l > 0 && x[l - 1] === x[i]) l--;
//             while (r < x.length - 1 && x[r + 1] === x[i]) r++;
//             leftEdges.push(l);
//             rightEdges.push(r);
//         }
//     }

//     // --- Step 2: filter by plateauSize ---
//     if (plateauSize !== null) {
//         const keep = rightEdges.map((r, idx) => (r - leftEdges[idx] + 1) >= plateauSize);
//         peaks = peaks.filter((_, idx) => keep[idx]);
//         leftEdges = leftEdges.filter((_, idx) => keep[idx]);
//         rightEdges = rightEdges.filter((_, idx) => keep[idx]);
//     }

//     // --- Step 3: filter by height ---
//     if (height !== null) {
//         const [hmin, hmax] = Array.isArray(height) ? height : [height, Infinity];
//         const keep = peaks.map(i => x[i] >= hmin && x[i] <= hmax);
//         peaks = peaks.filter((_, idx) => keep[idx]);
//         leftEdges = leftEdges.filter((_, idx) => keep[idx]);
//         rightEdges = rightEdges.filter((_, idx) => keep[idx]);
//     }

//     // --- Step 4: calculate prominences ---
//     let prominences = [];
//     for (let idx = 0; idx < peaks.length; idx++) {
//         const i = peaks[idx];
//         let leftMin = x[i];
//         for (let j = i; j >= 0; j--) {
//             if (x[j] > x[i]) break;
//             leftMin = Math.min(leftMin, x[j]);
//         }
//         let rightMin = x[i];
//         for (let j = i; j < x.length; j++) {
//             if (x[j] > x[i]) break;
//             rightMin = Math.min(rightMin, x[j]);
//         }
//         prominences.push(x[i] - Math.max(leftMin, rightMin));
//     }

//     // --- Step 5: filter by prominence ---
//     if (prominence !== null) {
//         const keep = prominences.map(p => p >= prominence);
//         peaks = peaks.filter((_, idx) => keep[idx]);
//         leftEdges = leftEdges.filter((_, idx) => keep[idx]);
//         rightEdges = rightEdges.filter((_, idx) => keep[idx]);
//         prominences = prominences.filter((_, idx) => keep[idx]);
//     }

//     // --- Step 6: filter by minimum distance ---
//     if (distance > 1 && peaks.length > 1) {
//         // Sort peaks by height descending
//         const sorted = peaks.map((p, idx) => ({ idx, peak: p, height: x[p] }))
//                             .sort((a, b) => b.height - a.height);
//         let keepIdx = new Set();
//         for (const s of sorted) {
//             if ([...keepIdx].every(k => Math.abs(peaks[k] - s.peak) >= distance)) {
//                 keepIdx.add(s.idx);
//             }
//         }
//         const finalPeaks = [...keepIdx].map(k => peaks[k]).sort((a, b) => a - b);
//         peaks = finalPeaks;
//         // Update edges and prominences accordingly
//         leftEdges = peaks.map(p => leftEdges[peaks.indexOf(p)]);
//         rightEdges = peaks.map(p => rightEdges[peaks.indexOf(p)]);
//         prominences = peaks.map(p => prominences[peaks.indexOf(p)]);
//     }

//     // --- Step 7: compute widths ---
//     let widths = [];
//     if (width !== null) {
//         widths = peaks.map((p, idx) => rightEdges[idx] - leftEdges[idx] + 1);
//         const keep = widths.map(w => w >= width);
//         peaks = peaks.filter((_, idx) => keep[idx]);
//         leftEdges = leftEdges.filter((_, idx) => keep[idx]);
//         rightEdges = rightEdges.filter((_, idx) => keep[idx]);
//         prominences = prominences.filter((_, idx) => keep[idx]);
//         widths = widths.filter((_, idx) => keep[idx]);
//     }

//     const properties = {
//         leftEdges,
//         rightEdges,
//         prominences,
//         widths
//     };

//     return { peaks, properties };
// }