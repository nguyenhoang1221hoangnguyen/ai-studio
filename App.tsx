import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ImageDisplay } from './components/ImageDisplay';
import { generateStyledImage } from './services/geminiService';
import { ImageFile } from './types';

function App() {
  const [modelImage, setModelImage] = useState<ImageFile | null>(null);
  const [itemImages, setItemImages] = useState<ImageFile[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track in-flight actions to prevent duplicate submits
  const abortRef = useRef<AbortController | null>(null);
  const cancelInFlight = useCallback(() => {
    try {
      abortRef.current?.abort();
    } catch {}
    abortRef.current = null;
  }, []);

  // Clean up object URLs from previews on unmount
  useEffect(() => {
    return () => {
      cancelInFlight();
      if (modelImage?.preview) URL.revokeObjectURL(modelImage.preview);
      itemImages.forEach(i => i.preview && URL.revokeObjectURL(i.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- Utils: image downscale, error normalize, dataUrl->File --------
  const downscaleImage = useCallback(async (file: File, maxSide = 1600): Promise<File> => {
    // Skip if already small
    const bitmap = await createImageBitmap(file).catch(async () => {
      // Fallback path via HTMLImageElement if createImageBitmap not available
      const dataUrl = await fileToDataURL(file);
      return await loadImageBitmap(dataUrl);
    });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob: Blob = await new Promise(resolve => canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', 0.92));
    const safeName = file.name.replace(/\.\w+$/, '.jpg');
    return new File([blob], safeName, { type: 'image/jpeg' });
  }, []);

  function fileToDataURL(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  function loadImageBitmap(dataUrl: string): Promise<ImageBitmap> {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        createImageBitmap(img).then(res).catch(rej);
      };
      img.onerror = rej;
      img.src = dataUrl;
    });
  }

  function normalizeError(err: unknown): string {
    if (err && typeof err === 'object' && 'name' in err && (err as any).name === 'AbortError') {
      return 'Yêu cầu đã bị hủy.';
    }
    const msg = (err instanceof Error ? err.message : String(err || 'Lỗi không xác định')).trim();
    if (/413/.test(msg)) return 'Tệp ảnh quá lớn (413). Hãy giảm kích thước ảnh.';
    if (/429/.test(msg)) return 'Quá nhiều yêu cầu (429). Vui lòng thử lại sau.';
    if (/5\d{2}/.test(msg)) return 'Dịch vụ tạm lỗi (5xx). Hãy thử lại.';
    return msg || 'Đã xảy ra lỗi.';
  }

  async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type || 'image/png' });
  }

  // ------------------------------ Actions ------------------------------
  const handleGenerate = async () => {
    if (!modelImage || itemImages.length === 0) {
      setError('Please upload a model image and at least one item image.');
      return;
    }
    if (isLoading || isUpscaling) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    // Cancel any inflight job (best-effort)
    cancelInFlight();
    abortRef.current = new AbortController();

    // Strong, server-friendly prompt (kept client-side as requested)
    const promptParts: string[] = [
      '**Role:** You are a world-class AI digital artist specializing in hyper-realistic virtual try-on for high-end e-commerce platforms. Your work is indistinguishable from a professional photoshoot.',
      `**Objective:** Generate a single, flawless, photorealistic image of the model from the [Model Image]. This specific model MUST be dressed in ALL ${itemImages.length} of the provided clothing and accessory items from the [Garment Image] inputs.`,
      '\n--- NON-NEGOTIABLE CORE DIRECTIVES ---',
      '**1. ABSOLUTE IDENTITY PRESERVATION:** The person in the [Model Image] is the ONLY subject. You MUST preserve their exact face, hair, skin tone, and body. DO NOT generate a new person or alter their features. The model is the canvas; the garments are the paint.',
      '**2. POSE & BODY CONTINUITY:** Maintain the model’s original pose and body proportions; garments should adapt naturally to the pose.',
      '**3. HEADLESS INTEGRITY:** If the input is headless, the output must remain headless. Do not invent a head or face.',
      '\n--- STYLING & REALISM DIRECTIVES ---',
      '**1. PHOTOREALISTIC INTEGRATION:**',
      '   - Fabric physics: drape, folds, wrinkles must follow the body and material.',
      '   - Consistent lighting: match highlights/shadows to the [Model Image].',
      '   - Texture fidelity: reproduce material properties (leather sheen, knit weave, chiffon translucency).',
      '**2. PRODUCT ACCURACY:** Keep true colors, patterns, logos, and design details of each garment.',
      '**3. CLEAN COMPOSITING:** No artifacts at neckline, cuffs, waistline; hands/fingers remain anatomically correct.',
      `**4. COMPLETE THE OUTFIT:** You must incorporate ALL ${itemImages.length} provided garment/accessory images onto the model. Do not omit any items.`,
      '\n--- NEGATIVE CONSTRAINTS ---',
      'No extra fingers, no warped logos, no text overlays, no watermarks, no duplicated limbs.',
      '\n--- OUTPUT SPEC ---',
      'Deliver one clean, high-resolution image focusing solely on the styled model against a neutral/simple background. PNG preferred. Resolution target: ~2000×3000.'
    ];

    if (customPrompt.trim()) {
      promptParts.push('\n--- USER CUSTOMIZATIONS ---');
      promptParts.push(`- ${customPrompt.trim()}`);
    }

    const fullPrompt = promptParts.join('\n');

    try {
      // Pre-resize inputs to reduce bandwidth & improve stability
      const preparedModel: ImageFile = {
        ...modelImage,
        file: await downscaleImage(modelImage.file, 1600),
      };
      const preparedItems: ImageFile[] = await Promise.all(
        itemImages.map(async (it) => ({
          ...it,
          file: await downscaleImage(it.file, 1600),
        }))
      );

      // NOTE: generateStyledImage signature is preserved per your existing service.
      const result = await generateStyledImage(preparedModel, preparedItems, fullPrompt);
      setGeneratedImage(result);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpscale = async () => {
    if (!generatedImage) {
      setError('No image available to upscale.');
      return;
    }
    if (isUpscaling || isLoading) return;

    setIsUpscaling(true);
    setError(null);

    // Cancel any inflight job (best-effort)
    cancelInFlight();
    abortRef.current = new AbortController();

    const upscalePrompt =
      'Act as an expert AI photo upscaler. Your only task is to enhance the provided image. Increase its resolution to the maximum possible quality, sharpen details, and improve texture fidelity. CRITICAL: DO NOT alter the image\'s content, colors, or composition. The output must be a photorealistic, higher-fidelity version of the exact same input image.';

    try {
      // Convert dataURL back to File for consistent interface
      const imageFile = await dataUrlToFile(generatedImage, 'generated-image-for-upscale.png');
      const imageToUpscale: ImageFile = {
        id: crypto.randomUUID(),
        file: imageFile,
        preview: generatedImage,
      };

      const result = await generateStyledImage(imageToUpscale, [], upscalePrompt);
      setGeneratedImage(result);

      // Automatically download the upscaled image
      const link = document.createElement('a');
      link.href = result;
      const mimeType = result.split(';')[0].split(':')[1];
      const extension = mimeType.split('/')[1] || 'png';
      link.download = `gemini-styled-look-upscaled.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setIsUpscaling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-4">
      <header className="w-full max-w-7xl text-center mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Gemini Virtual Try-On Studio
          </span>
        </h1>
        <p className="mt-3 text-base text-gray-400 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl">
          Upload a model, pick your fashion items, and let AI create the perfect look.
        </p>
      </header>
      <main className="w-full max-w-7xl flex-1 flex flex-col lg:flex-row bg-gray-800/50 rounded-2xl shadow-2xl overflow-hidden">
        <ControlPanel
          modelImage={modelImage}
          setModelImage={setModelImage}
          itemImages={itemImages}
          setItemImages={setItemImages}
          customPrompt={customPrompt}
          setCustomPrompt={setCustomPrompt}
          onGenerate={handleGenerate}
          isLoading={isLoading}
          isUpscaling={isUpscaling}
          error={error}
        />
        <ImageDisplay
          modelImage={modelImage}
          generatedImage={generatedImage}
          isLoading={isLoading}
          isUpscaling={isUpscaling}
          onUpscale={handleUpscale}
        />
      </main>
    </div>
  );
}

export default App;
