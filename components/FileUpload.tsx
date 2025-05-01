"use client"

import { useUser } from "@clerk/nextjs";
import {
    ImageKitAbortError,
    ImageKitInvalidRequestError,
    ImageKitServerError,
    ImageKitUploadNetworkError,
    upload,
} from "@imagekit/next";
import { useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import ImageKit from "imagekit";
import { Bounce, ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { not } from "drizzle-orm";

interface UploadExampleProps {
    fileInputRef: RefObject<HTMLInputElement | null>;
    parentId: string;
    onUploadComplete?: () => void;
}

const UploadExample: React.FC<UploadExampleProps> = ({ fileInputRef, parentId, onUploadComplete }) => {
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const { user } = useUser();

    const abortController = new AbortController();

    const notifyError = (message: string) => toast.error(message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        transition: Bounce,
      })

    const authenticator = async () => {
        try {
            const response = await fetch("/api/upload-auth");
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Request failed with status ${response.status}: ${errorText}`);
            }
            const data = await response.json();
            const { signature, expire, token, publicKey } = data;
            return { signature, expire, token, publicKey };
        } catch (error) {
            console.error("Authentication error:", error);
            throw new Error("Authentication request failed");
        }
    };

    const handleUpload = async () => {
        const fileInput = fileInputRef.current;
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            return;
        }

        setIsUploading(true);
        const file = fileInput.files[0];

        if(file.size > 100000000) {
            alert("File size exceeds 100MB limit. Please choose a smaller file.");
            setIsUploading(false);
            return;
        }

        try {
            const authParams = await authenticator();
            const { signature, expire, token, publicKey } = authParams;

            const uploadResponse = await upload({
                expire,
                token,
                signature,
                publicKey,
                file,
                fileName: file.name,
                onProgress: (event) => {
                    setProgress((event.loaded / event.total) * 100);
                },
                abortSignal: abortController.signal,
            });

            const response = await fetch('/api/upload', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    imagekit: uploadResponse,
                    userId: user?.id,
                    parentId: parentId
                })
            });
            
            if (!response.ok) {
                const data = await response.json();
                notifyError(data.error || "Failed to save file information");
                const response2 = await fetch("/api/delete-media", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        originalFileId: uploadResponse.fileId,
                        userId: user?.id
                    })
                });
                if (!response2.ok) {
                    const data = await response2.json();
                    notifyError(data.error || "Failed to delete file from ImageKit");
                }
                throw new Error(data.error || "Failed to save file information");
                
            }

            // Reset the file input and progress
            if (fileInput) {
                fileInput.value = '';
            }
            setProgress(0);
            
            // Call the callback to update UI
            onUploadComplete?.();
            
        } catch (error) {
            if (error instanceof ImageKitAbortError) {
                console.error("Upload aborted:", error.reason);
            } else if (error instanceof ImageKitInvalidRequestError) {
                console.error("Invalid request:", error.message);
            } else if (error instanceof ImageKitUploadNetworkError) {
                console.error("Network error:", error.message);
            } else if (error instanceof ImageKitServerError) {
                console.error("Server error:", error.message);
            } else {
                console.error("Upload error:", error);
            }
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleUpload}
                accept="image/*,application/pdf"
            />
            <Button
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? `Uploading ${Math.round(progress)}%` : "Upload"}
            </Button>
        </div>
    );
};

export default UploadExample;