"use client";
import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CloudUpload, Edit, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTokenStore } from "@/store/token.store";

const FileUploader: React.FC = () => {
  const file: any = useTokenStore((state) => state.file);
  const setFile = useTokenStore((state) => state.setFile);
  const isFileError = useTokenStore((state) => state.isFileError);
  const [isHovered, setIsHovered] = useState(false);

  const { getRootProps, getInputProps, open, acceptedFiles } = useDropzone({
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
    },
  });

  useEffect(() => {
    if (acceptedFiles?.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, [acceptedFiles]);
  return (
    <div>
      <div {...getRootProps({ className: "dropzone" })}>
        <input {...getInputProps()} />
        {file ? (
          <div
            className="relative w-[150px] h-[150px] mx-auto"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Image
              src={URL.createObjectURL(file)}
              alt={file?.path}
              width={0}
              height={0}
              sizes="100vw"
              className="w-[150px] h-[150px] rounded-lg hover:bg-opacity-50"
            />
            {isHovered && (
              <div className="absolute top-0 right-0 bottom-0 left-0 flex justify-center items-center gap-10 bg-[#00000088] rounded-lg">
                <Edit
                  onClick={open}
                  className="size-8 cursor-pointer hover:scale-110 "
                />
                <Trash2
                  onClick={() => setFile(null)}
                  className="size-8 cursor-pointer hover:scale-110 "
                />
              </div>
            )}
          </div>
        ) : (
          <>
            <div
              className="cursor-pointer rounded-lg w-[100px] h-[100px] flex flex-col justify-center items-center space-y-1 p-4 mx-auto border border-dashed border-[#000000] dark:border-[#000000]"
              onClick={open}
            >
              <div>
                <CloudUpload className="size-8" />
              </div>
              <div className="text-[10px] text-center">
                Click or drag image.
              </div>
            </div>
            {isFileError && <div className="text-[0.8rem] font-medium text-destructive text-center">Please select the logo</div>}
          </>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
