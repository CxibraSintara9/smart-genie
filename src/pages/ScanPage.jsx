import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FiCamera, FiArrowLeft, FiUpload } from "react-icons/fi";
import { BsLightningCharge, BsLightningChargeFill } from "react-icons/bs";

const ScanPage = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [videoTrack, setVideoTrack] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const track = stream.getVideoTracks()[0];
        setVideoTrack(track);
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    startCamera();

    return () => {
      const stream = videoRef.current?.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleFlash = async () => {
    if (!videoTrack) return;

    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: !isFlashOn }],
      });
      setIsFlashOn(!isFlashOn);
    } catch (err) {
      console.warn("Flash not supported:", err);
    }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    // Compress image to JPEG with 80% quality for faster processing
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleUpload = async () => {
    const fileName = `dish-${Date.now()}.png`;
    const blob = await (await fetch(capturedImage)).blob();

    const { data, error } = await supabase.storage
      .from("dishimages")
      .upload(fileName, blob);

    if (error) {
      console.error("Upload error:", error);
    } else {
      console.log("Uploaded to Supabase:", data);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col items-center p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="self-start mb-4 flex items-center text-green-600 hover:underline"
      >
        <FiArrowLeft className="mr-1" />
        Back
      </button>

      <h1 className="text-2xl font-bold mb-4">Scan a Dish</h1>

      {!capturedImage ? (
        <div className="flex flex-col items-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-[320px] h-[240px] rounded-md shadow"
          />
          <canvas ref={canvasRef} width="640" height="480" className="hidden" />

          <div className="mt-4 flex gap-6">
            {/* Flash Toggle Icon */}
            <button
              onClick={toggleFlash}
              className="p-3 bg-yellow-400 text-white rounded-full hover:bg-yellow-500 text-xl"
            >
              {isFlashOn ? <BsLightningChargeFill /> : <BsLightningCharge />}
            </button>

            {/* Capture Icon */}
            <button
              onClick={capturePhoto}
              className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 text-xl"
            >
              <FiCamera />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <img
            src={capturedImage}
            alt="Captured"
            className="w-[320px] h-[240px] object-cover rounded-md shadow"
          />
          <div className="mt-4 flex gap-4">
            <button
              onClick={handleRetake}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Retake
            </button>
            <button
              onClick={handleUpload}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
            >
              <FiUpload /> Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanPage;
