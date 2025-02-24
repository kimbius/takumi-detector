<script lang="ts">
  import { onMount } from "svelte";
  import { startWebcam } from "@/webcam";
  import { runYOLOModel } from "@/utils";

  let video: HTMLVideoElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
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
    if (!video || !canvas || !ctx || isTakumi) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const result = await runYOLOModel(canvas.toDataURL("base64"));
    console.log(result);
    isTakumi = !!result.length;

    requestAnimationFrame(processFrame);
  }
</script>

<canvas bind:this={canvas} width="640" height="480" class="hidden"></canvas>
<div class="flex flex-col items-center justify-center">
  <h1 class="font-bold text-2xl my-5">
    คุณคือ <span class="underline text-destructive"> Takuma Sumi </span> ตัวจริงหรือไม่?
  </h1>
  <h2 class="font-bold">กล้องตรวจสอบความปลอดภัย</h2>
  <video
    bind:this={video}
    class="w-[320px] rounded-lg bg-gray-200"
    style={`-o-transform : scaleX(-1);
  -moz-transform : scaleX(-1);
  -webkit-transform : scaleX(-1);
  -ms-transform: scaleX(-1);
  transform : scaleX(-1);`}
  >
    <track kind="captions" srclang="en" label="English captions" />
  </video>
  {#if isTakumi}
    <div class="flex flex-col items-center mt-10">
      <p class="text-5xl font-bold">
        🤩 คุณคือ <span class="text-amber-400">Takuma Sumi</span> ตัวจริง! 🤩
      </p>
    </div>
  {/if}
</div>
