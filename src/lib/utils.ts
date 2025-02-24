import { Jimp } from "jimp";
import * as ort from "onnxruntime-web";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const MODEL_PATH = "https://storage.preps.cc/e029c9ddbb3e951a5355e24c8dc37533/takumi.onnx";

async function loadImageFromPath(path: string, width = 640, height = 640) {
  var imageData = await Jimp.read(path).then((imageBuffer) => {
    return imageBuffer.resize({
      w: width,
      h: height,
    });
  });

  return imageData;
}

function imageDataToTensor(image: any, dims: number[]): ort.Tensor {
  var imageBufferData = image.bitmap.data;
  const [redArray, greenArray, blueArray] = new Array(
    new Array<number>(),
    new Array<number>(),
    new Array<number>()
  );

  for (let i = 0; i < imageBufferData.length; i += 4) {
    redArray.push(imageBufferData[i]);
    greenArray.push(imageBufferData[i + 1]);
    blueArray.push(imageBufferData[i + 2]);
  }

  const transposedData = redArray.concat(greenArray).concat(blueArray);

  const float32Data = new Float32Array(dims[1] * dims[2] * dims[3]);
  for (let i = 0; i < transposedData.length; i++) {
    float32Data[i] = transposedData[i] / 255.0;
  }

  return new ort.Tensor("float32", float32Data, dims);
}

export async function runYOLOModel(imagePath: string) {
  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = false;
  ort.env.wasm.proxy = false;

  const session = await ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });

  const image = await loadImageFromPath(imagePath, 640, 640);
  const imageTensor = imageDataToTensor(image, [1, 3, 640, 640]);

  const feeds: Record<string, ort.Tensor> = {};
  feeds[session.inputNames[0]] = imageTensor;

  const outputData = await session.run(feeds);

  const detections = processYOLOOutput(outputData);
  return detections;
}

const labels: Record<string, string> = {
  "0": "alien",
  "1": "Takuma Sumi",
};

function processYOLOOutput(outputData: Record<string, ort.Tensor>) {
  const output = outputData[Object.keys(outputData)[0]];
  const data = output.data as Float32Array;
  const numDetections = data.length / 6;

  const boxes = [];
  for (let i = 0; i < numDetections; i++) {
    const x = data[i * 6];
    const y = data[i * 6 + 1];
    const w = data[i * 6 + 2];
    const h = data[i * 6 + 3];
    const score = data[i * 6 + 4];
    const classId = Math.round(data[i * 6 + 5]);

    if (score > 0.2) {
      boxes.push({
        x,
        y,
        w,
        h,
        score,
        classId: classId.toString(),
        label: labels[classId.toString()],
      });
    }
  }

  boxes.sort((a, b) => a.score - b.score);

  return boxes.length ? [boxes[0]] : [];
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function drawDetections(canvas: HTMLCanvasElement, detections: any[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const { x, y, w, h, score, label } of detections) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);

    ctx.fillStyle = "red";
    ctx.font = "16px Arial";
    ctx.fillText(
      `${label} (${(score * 100).toFixed(1)}%)`,
      x - w / 2,
      y - h / 2 - 5
    );
  }
}
