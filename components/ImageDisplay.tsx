import React from 'react';
import { ImageFile } from '../types';

interface ImageDisplayProps {
  modelImage: ImageFile | null;
  generatedImage: string | null;
  isLoading: boolean;
  isUpscaling: boolean;
  onUpscale: () => void;
}

// FIX: Made the 'children' prop optional to make the component more robust and fix the type error.
const Placeholder = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg p-8">
        <div className="text-gray-400 mb-4">{children}</div>
        <h3 className="text-xl font-semibold text-gray-500">{title}</h3>
    </div>
);

const ModelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const MagicWandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.25278C12 6.25278 1.33333 4.41945 2.99999 13.7528C4.66666 23.0861 12 21.2528 12 21.2528M12 6.25278C12 6.25278 22.6667 4.41945 21 13.7528C19.3333 23.0861 12 21.2528 12 21.2528M12 6.25278V2.91945M17.3333 3.75278L15.6667 6.25278M6.66666 3.75278L8.33332 6.25278" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const UpscaleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
);


export const ImageDisplay: React.FC<ImageDisplayProps> = ({ modelImage, generatedImage, isLoading, isUpscaling, onUpscale }) => {
    
    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        const mimeType = generatedImage.split(';')[0].split(':')[1];
        const extension = mimeType.split('/')[1] || 'png';
        link.download = `gemini-styled-look.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            <div className="flex flex-col items-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-300">Original Model</h2>
                <div className="w-full aspect-w-3 aspect-h-4 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
                    {modelImage ? (
                        <img src={modelImage.preview} alt="Original model" className="w-full h-full object-contain" />
                    ) : (
                        <Placeholder title="Upload a Model"><ModelIcon/></Placeholder>
                    )}
                </div>
            </div>
            <div className="flex flex-col items-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-300">Styled Look</h2>
                <div className="w-full aspect-w-3 aspect-h-4 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center relative">
                    {(isLoading || isUpscaling) && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                            <svg className="animate-spin h-10 w-10 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-lg">{isUpscaling ? 'Upscaling image...' : 'Generating your new look...'}</p>
                        </div>
                    )}
                    {generatedImage ? (
                        <>
                            <img src={generatedImage} alt="Generated style" className="w-full h-full object-contain" />
                             {!(isLoading || isUpscaling) && (
                                <div className="absolute bottom-4 right-4 flex items-center gap-x-2">
                                    <button
                                        onClick={onUpscale}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full flex items-center transition-transform duration-300 hover:scale-105 shadow-lg"
                                        aria-label="Upscale generated image"
                                    >
                                        <UpscaleIcon />
                                        <span className="ml-2">Upscale</span>
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full flex items-center transition-transform duration-300 hover:scale-105 shadow-lg"
                                        aria-label="Download generated image"
                                    >
                                        <DownloadIcon />
                                        <span className="ml-2">Download</span>
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                         <Placeholder title="Your Styled Image Appears Here"><MagicWandIcon/></Placeholder>
                    )}
                </div>
            </div>
        </div>
    );
};