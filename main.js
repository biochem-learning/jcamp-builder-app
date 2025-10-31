/// Add a cache dictionary with key = jcamp1, assignments, jcamp2 and values = merged jacmp of such values
/// Before making a merge request, check the dictionary if the merged jcamp is available

/// When click identify peaks, return the merge jcamp and store it in cache
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

const manualIdBtn = document.querySelector("#manual-id");
manualIdBtn.addEventListener("click", () => {
    displayOrHideElement(".overlay")
});

const specFileInput = document.getElementById("spec-file-reader");
const strucFileInput = document.getElementById("struc-file-reader");

let specFileContent;
let strucFileContent;

let builtJcamp;
let strucCanvas;
let specCanvas;

let viewMode = "CNMR"

specFileInput.addEventListener("change", function (event) {
  handleFileSelection(event, (content) => {
    specFileContent = content;

    let specCanvas = new ChemDoodle.io.JCAMPInterpreter().makeStructureSpectrumSet(
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
    strucFileContent = content;

    let strucCanvas = new ChemDoodle.io.JCAMPInterpreter().makeStructureSpectrumSet(
        'struc', 
        strucFileContent, 
        percentage('#struc_molecule',50, "width"), 
        percentage('#struc_molecule',100, "height"),
        0, 
        0,
    )
    
  });
});

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

function createAssignments() {
  const wrapper = document.createElement("div");
  wrapper.className = "assignments-wrapper";
  const xDiv = document.createElement("div");
  xDiv.className = "assignments";
  xDiv.innerHTML = 'X: <input class="assign-input file-reader struc-file-reader-x" type="text"/>';

  const yDiv = document.createElement("div");
  yDiv.className = "assignments";
  yDiv.innerHTML = 'Y: <input class="assign-input file-reader struc-file-reader-y" type="text"/>';

  const atomDiv = document.createElement("div");
  atomDiv.className = "assignments atom-assignment";
  atomDiv.innerHTML = 'Atom IDs: <input class="assign-input file-reader atom-assign-input" type="text"/>';

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-assign";
  deleteBtn.textContent = "X";

  deleteBtn.addEventListener("click", () => {
    wrapper.remove();
  });

  wrapper.appendChild(xDiv);
  wrapper.appendChild(yDiv);
  wrapper.appendChild(atomDiv);
  wrapper.appendChild(deleteBtn);

  const assignment_section = document.querySelector(".right-section");
  assignment_section.appendChild(wrapper);
}

addAssignmentsBtn = document.querySelector("#add-assign-btn")
addAssignmentsBtn.addEventListener("click", createAssignments)

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
      let assignments = getAssignments()
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
    if (!floatRegex.test(yVal)) {
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
  const metadataDivs = document.querySelectorAll(".metadata-input");
  const metadataDict = {};

  metadataDivs.forEach(input => {
    const label = input.parentElement.textContent.replace(":", "").trim();
    metadataDict[label] = String(input.value || "");
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