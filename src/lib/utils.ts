import { Jimp } from "jimp";
import * as ort from "onnxruntime-web";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = false;
ort.env.wasm.proxy = false;

export const MODEL_PATH =
  "https://storage-preps.bius.work/e029c9ddbb3e951a5355e24c8dc37533/takumi.onnx";

async function loadImageFromPath(path: string, width = 640, height = 640) {
  var imageData = await Jimp.read(path).then((imageBuffer) => {
    return imageBuffer.resize({
      w: width,
      h: height,
    });
  });

  return imageData;
}

function getImageTensorFromVideo(video: HTMLVideoElement): ort.Tensor {
  const modelSize = 640; // YOLO ต้องการ 640x640
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // คำนวณให้ภาพอยู่ตรงกลางแบบ letterbox (ใส่ขอบดำแทน stretch)
  const scale = Math.min(
    modelSize / video.videoWidth,
    modelSize / video.videoHeight
  );
  const newWidth = Math.round(video.videoWidth * scale);
  const newHeight = Math.round(video.videoHeight * scale);

  canvas.width = modelSize;
  canvas.height = modelSize;

  // เคลียร์พื้นหลังให้เป็นสีดำ
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, modelSize, modelSize);

  // วาดภาพตรงกลางแบบ maintain aspect ratio
  ctx.drawImage(
    video,
    (modelSize - newWidth) / 2,
    (modelSize - newHeight) / 2,
    newWidth,
    newHeight
  );

  const imageData = ctx.getImageData(0, 0, modelSize, modelSize);
  const float32Data = new Float32Array(modelSize * modelSize * 3);

  for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
    float32Data[j] = imageData.data[i] / 255.0;
  }

  return new ort.Tensor("float32", float32Data, [1, 3, modelSize, modelSize]);
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

export async function runYOLOModel(
  session: ort.InferenceSession,
  imagePath: string
) {
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

function processYOLOOutput(
  outputData: Record<string, ort.Tensor>,
  width: number = 640,
  height: number = 640
) {
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

    if (score > 0.5) {
      boxes.push({
        x: x,
        y: y,
        w: w,
        h: h,
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
    console.log(x, y, w, h);

    const x1 = x - w / 2;
    const y1 = y - h / 2;

    const boxWidth = w;
    const boxHeight = h;

    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, boxWidth, boxHeight);

    ctx.fillStyle = "red";
    ctx.font = "16px Arial";
    ctx.fillText(`${label} (${(score * 100).toFixed(1)}%)`, x1, y1 - 5);
  }
}
