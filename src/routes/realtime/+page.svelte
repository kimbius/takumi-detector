<script lang="ts">
  import { onMount } from "svelte";
  import { startWebcam } from "@/webcam";
  import { cn, runYOLOModel } from "@/utils";
  import confetti from "canvas-confetti";

  let video: HTMLVideoElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let boxCanvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  let isTakumi = $state(false);

  onMount(async () => {
    if (video) await startWebcam(video);

    if (canvas) {
      ctx = canvas.getContext("2d");
      processFrame();
    }
  });

  async function processFrame() {
    if (!video || !canvas || !ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const detections = await runYOLOModel(canvas.toDataURL("base64"));
    // console.log(detections);
    const previousIsTakumi = isTakumi;
    isTakumi = !!detections.length;
    if (isTakumi && !previousIsTakumi) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.5, x: 0.5 },
      });
    }
    // if (boxCanvas) drawDetections(boxCanvas, detections);

    requestAnimationFrame(processFrame);
  }
</script>

<div class="flex flex-col items-center justify-center">
  <h1 class="font-bold text-2xl my-5">
    คุณคือ <span class="underline text-destructive"> Takuma Sumi </span> ตัวจริงหรือไม่?
  </h1>
  <h2 class="font-bold">กล้องตรวจสอบความเป็นทาคุมะ</h2>
  <div class="relative size-[500px]">
    <canvas
      bind:this={canvas}
      class="hidden size-full"
      style={`-o-transform : scaleX(-1);
  -moz-transform : scaleX(-1);
  -webkit-transform : scaleX(-1);
  -ms-transform: scaleX(-1);
  transform : scaleX(-1);`}
    ></canvas>
    <canvas bind:this={boxCanvas} class="absolute z-50 left-0 top-0 size-full"
    ></canvas>
    <video
      bind:this={video}
      class={cn(
        "size-full rounded-lg",
        isTakumi ? "bg-amber-400" : "bg-destructive"
      )}
      style={`-o-transform : scaleX(-1);
    -moz-transform : scaleX(-1);
    -webkit-transform : scaleX(-1);
    -ms-transform: scaleX(-1);
    transform : scaleX(-1);`}
    >
      <track kind="captions" srclang="en" label="English captions" />
    </video>
  </div>
  <div class="flex flex-col items-center mt-10">
    {#if isTakumi}
      <p class="text-5xl font-bold">
        🤩 คุณคือ <span class="text-amber-400">Takuma Sumi</span> ตัวจริง! 🤩
      </p>
    {:else}
      <p class="text-5xl font-bold">
        😡 คุณไม่ใช่ <span class="text-destructive">Takuma Sumi</span> ตัวจริง 😡
      </p>
    {/if}
  </div>
</div>
