import React, { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ImageDisplay } from './components/ImageDisplay';
import { generateStyledImage } from './services/geminiService';
import { ImageFile, CustomizationOptions } from './types';

function App() {
  const [modelImage, setModelImage] = useState<ImageFile | null>(null);
  const [itemImages, setItemImages] = useState<ImageFile[]>([]);
  const [customizations, setCustomizations] = useState<CustomizationOptions>({
    shape: 'Default',
    expression: 'Default',
    beauty: 'Default',
  });
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!modelImage || itemImages.length === 0) {
      setError("Please upload a model image and at least one item image.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    const promptParts: string[] = [
      "You are an expert AI fashion stylist and senior e-commerce photo editor. Your objective is to generate a single, professional, photorealistic e-commerce fashion photograph.",
      "Your task is to take the person from the [Model Image] and realistically dress them in the items provided in the individually labeled [Garment Image] inputs (e.g., top, bottom, shoes, accessories).",
      "\nCRITICAL INSTRUCTIONS (MUST BE FOLLOWED):",
      "IDENTITY PRESERVATION: You MUST preserve the model's original face, hair, and skin tone. The identity of the person in the output image must be an EXACT MATCH to the original [Model Image]. Do NOT alter, modify, or generate new facial features under any circumstances.",
      "HEADLESS CASE: If the original [Model Image] is headless (does not show a face), the output image MUST also be headless. Do not invent or generate a face.",
      "\nQUALITY & REALISM REQUIREMENTS:",
      "SEAMLESS BLENDING: Seamlessly blend the new clothing onto the model's body. The result must be photorealistic.",
      "PRODUCT AUTHENTICITY: Preserve the authenticity of the garments. The texture, material properties (e.g., sheen, wrinkles, fabric type), and original form of the items from the [Garment Image] inputs must be accurately and naturally represented.",
      "NATURAL PHYSICS: Ensure all lighting, shadows, and fabric folds conform realistically to the model's body and pose.",
    ];

    const customizationInstructions: string[] = [];
    if (customizations.shape !== 'Default') {
      customizationInstructions.push(`- Adjust the model's body shape to be more '${customizations.shape}'.`);
    }
    if (customizations.expression !== 'Default') {
      customizationInstructions.push(`- Gently modify the model's facial expression to be '${customizations.expression}', while keeping their core facial identity unchanged.`);
    }
    if (customizations.beauty !== 'Default') {
      customizationInstructions.push(`- Apply a '${customizations.beauty}' aesthetic to the overall image style (e.g., lighting, mood).`);
    }
    if (customPrompt.trim()) {
      customizationInstructions.push(`- Additional instruction: "${customPrompt.trim()}".`);
    }

    if(customizationInstructions.length > 0) {
        promptParts.push("\nUSER CUSTOMIZATIONS:");
        promptParts.push(...customizationInstructions);
    }

    promptParts.push("\nFINAL OUTPUT: The final output should be a clean, high-resolution image (2000x3000 pixels) of only the styled model.");


    const fullPrompt = promptParts.join('\n');

    try {
      const result = await generateStyledImage(modelImage, itemImages, fullPrompt);
      setGeneratedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpscale = async () => {
    if (!generatedImage) {
      setError("No image available to upscale.");
      return;
    }

    setIsUpscaling(true);
    setError(null);

    const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return new File([blob], fileName, { type: blob.type });
    };

    try {
      const imageFile = await dataUrlToFile(generatedImage, 'generated-image-for-upscale.png');
      const imageToUpscale: ImageFile = {
        id: crypto.randomUUID(),
        file: imageFile,
        preview: generatedImage,
      };

      const upscalePrompt = "You are an expert AI photo editor specializing in image upscaling. Your sole task is to enhance the [Model Image] provided. Increase its resolution to the maximum possible quality (e.g., 4K resolution), sharpen details, improve texture fidelity, and refine lighting without altering the image's content. CRITICAL INSTRUCTION: You MUST NOT change the subject, colors, composition, or any other artistic aspect of the original [Model Image]. The output must be a photorealistic, higher-fidelity version of the exact same input [Model Image].";

      const result = await generateStyledImage(imageToUpscale, [], upscalePrompt);
      setGeneratedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during the upscaling process.");
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
          customizations={customizations}
          setCustomizations={setCustomizations}
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
