import React from 'react';
import { ImageFile } from '../types';

interface ControlPanelProps {
  modelImage: ImageFile | null;
  setModelImage: (image: ImageFile | null) => void;
  itemImages: ImageFile[];
  setItemImages: (images: ImageFile[]) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  isUpscaling: boolean;
  error: string | null;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const SparkleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m1-15l2 2m0 0l2-2m-2 2v4m-2 13l2-2m0 0l2 2m-2-2v-4M21 5l-2 2m0 0l-2-2m2 2v4m2 7l-2 2m0 0l-2-2m2 2v-4M12 3v4m-2 2h4m-2 7v4m-2-2h4" />
    </svg>
);

const FileInput: React.FC<{ id: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; label: string; multiple?: boolean }> = ({ id, onChange, label, multiple = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        <label htmlFor={id} className="cursor-pointer flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-600 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
            <UploadIcon />
            <span className="text-sm text-gray-300">Click to upload</span>
        </label>
        <input id={id} type="file" multiple={multiple} accept="image/*" className="hidden" onChange={onChange} />
    </div>
);


export const ControlPanel: React.FC<ControlPanelProps> = ({
  modelImage,
  setModelImage,
  itemImages,
  setItemImages,
  customPrompt,
  setCustomPrompt,
  onGenerate,
  isLoading,
  isUpscaling,
  error
}) => {
    const handleModelImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setModelImage({
                id: crypto.randomUUID(),
                file,
                preview: URL.createObjectURL(file),
            });
        }
    };

    const handleItemImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            // FIX: Explicitly type the 'file' parameter in the map function to resolve type inference issue.
            const newImageFiles: ImageFile[] = files.map((file: File) => ({
                id: crypto.randomUUID(),
                file,
                preview: URL.createObjectURL(file)
            }));
            setItemImages([...itemImages, ...newImageFiles]);
        }
    };
    
    const removeItemImage = (id: string) => {
        setItemImages(itemImages.filter(image => image.id !== id));
    };

    return (
        <div className="w-full lg:w-1/3 xl:w-1/4 bg-gray-800 p-6 space-y-6 overflow-y-auto h-full rounded-l-2xl">
            <h2 className="text-2xl font-bold text-center text-purple-400">Customization Studio</h2>
            
            <div className="space-y-4">
                <FileInput id="model-upload" onChange={handleModelImageChange} label="1. Upload Model Image" />
                {modelImage && (
                    <div className="p-2 bg-gray-700 rounded-lg">
                        <img src={modelImage.preview} alt="Model preview" className="w-24 h-24 object-cover mx-auto rounded-md" />
                    </div>
                )}
            </div>
            
            <div className="space-y-4">
                <FileInput id="items-upload" onChange={handleItemImagesChange} label="2. Upload Clothing & Accessories" multiple />
                 {itemImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 p-2 bg-gray-700 rounded-lg">
                        {itemImages.map(image => (
                            <div key={image.id} className="relative">
                                <img src={image.preview} alt="Item preview" className="w-full h-20 object-cover rounded-md" />
                                <button onClick={() => removeItemImage(image.id)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">&times;</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label htmlFor="custom-prompt" className="block text-lg font-semibold text-gray-300">3. Add Custom Instructions</label>
                <textarea 
                    id="custom-prompt" 
                    rows={4}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g., 'Add a retro filter', 'Change the background to a beach'" 
                    className="w-full p-2 border border-gray-600 bg-gray-700 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
            </div>
            
            {error && <div className="text-red-400 text-sm bg-red-900/50 p-3 rounded-md">{error}</div>}

            <button
                onClick={onGenerate}
                disabled={isLoading || isUpscaling || !modelImage || itemImages.length === 0}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                ) : (
                    <>
                        <SparkleIcon />
                        Generate Style
                    </>
                )}
            </button>
        </div>
    );
};
