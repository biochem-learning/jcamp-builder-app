function buildJcamp(metadatas, specJcamp, strucJcamp, assignments) {
  if (!strucJcamp) throw new Error("Invalid Structure JCAMP file.");
  if (!specJcamp) throw new Error("Invalid Spectral JCAMP file.");

  const metadata = ["##DATA_TYPE=LINK", "##BLOCKS="];
  for (const [key, value] of Object.entries(metadatas)) {
    metadata.push(`##${key}=${value}`);
  }

  const assignmentLines = ["##BLOCK_ID=3", "##PEAK ASSIGNMENTS=(XYMA)"];
  for (const [x, y, atoms] of assignments) {
    for (const atom of atoms) {
      assignmentLines.push(`(${jcampNumber(x)}, ${jcampNumber(y)}, , <${jcampNumber(atom)}>)`);
    }
  }
  assignmentLines.push("##END=$$ End of the assignment block");

  return [
    metadata.join("\n"),
    jcampBlock(strucJcamp, 1),
    assignmentLines.join("\n"),
    jcampBlock(specJcamp, 4)
  ].join("\n\n");
}

function jcampBlock(text, blockId) {
  const lines = text.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/);
  if (lines[lines.length - 1] === "") lines.pop();
  lines.splice(Math.min(1, lines.length), 0, `##BLOCK_ID=${blockId}`);
  return lines.join("\n");
}

function jcampNumber(value) {
  if (value === null || !Number.isFinite(value)) return "None";
  const token = JSON.stringify(value);
  if (!/[.e]/i.test(token)) return token;
  let formatted = token;
  if (value !== 0 && Math.abs(value) < 1e-4) formatted = value.toExponential();
  return formatted.replace(/e([+-]?)(\d+)$/i, (_, sign, digits) =>
    `e${sign || "+"}${digits.padStart(2, "0")}`);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildJcamp };
}
