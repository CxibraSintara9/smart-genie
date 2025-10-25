// import React, { useEffect, useState } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
// import { supabase } from "../supabaseClient";

// // --- Image hash & quality ---
// const getImageHash = (src) =>
//   new Promise((resolve, reject) => {
//     const img = new Image();
//     img.crossOrigin = "Anonymous";
//     img.onload = () => {
//       const size = 8;
//       const canvas = document.createElement("canvas");
//       const ctx = canvas.getContext("2d", { willReadFrequently: true });
//       canvas.width = size;
//       canvas.height = size;
//       ctx.drawImage(img, 0, 0, size, size);
//       const imageData = ctx.getImageData(0, 0, size, size).data;

//       let grayscale = [];
//       let totalBrightness = 0;
//       for (let i = 0; i < imageData.length; i += 4) {
//         const gray =
//           0.299 * imageData[i] +
//           0.587 * imageData[i + 1] +
//           0.114 * imageData[i + 2];
//         grayscale.push(gray);
//         totalBrightness += gray;
//       }

//       const avgBrightness = totalBrightness / grayscale.length;
//       const avg =
//         grayscale.reduce((sum, val) => sum + val, 0) / grayscale.length;
//       const variance =
//         grayscale.reduce((sum, val) => sum + (val - avg) ** 2, 0) /
//         grayscale.length;
//       const hash = grayscale.map((val) => (val > avg ? "1" : "0")).join("");

//       const warnings = [];
//       if (avgBrightness < 50) warnings.push("Image a bit dark 🌑");
//       if (avgBrightness > 240) warnings.push("Image a bit bright ☀️");
//       if (variance < 25) {
//         warnings.push(
//           "Image is too blurry, dark, light, low quality to analyze."
//         );
//         reject(
//           new Error("Image is too blurry, dark, light, low quality to analyze.")
//         );
//         return;
//       } else if (variance < 40)
//         warnings.push(
//           "Image is too blurry, dark, light, low quality to analyze."
//         );

//       resolve({
//         hash,
//         brightness: avgBrightness,
//         blurScore: variance,
//         warnings,
//       });
//     };
//     img.onerror = () => reject(new Error("Failed to load image"));
//     img.src = src;
//   });

// const hammingDistance = (hash1, hash2) => {
//   let dist = 0;
//   for (let i = 0; i < hash1.length; i++) if (hash1[i] !== hash2[i]) dist++;
//   return dist;
// };

// const compareHist = async () => 0.7;
// const orbCompare = async () => 0.6;

// export default function AnalyzePage() {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [imageSrc, setImageSrc] = useState(null);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const [stepIndex, setStepIndex] = useState(0);
//   const [error, setError] = useState(null);
//   const [confidence, setConfidence] = useState(null);
//   const [warnings, setWarnings] = useState([]);

//   const steps = [
//     { label: "Analyzing image", color: "red" },
//     { label: "Checking quality", color: "yellow" },
//     { label: "Identifying dish", color: "blue" },
//     { label: "Calculating nutrition", color: "green" },
//     { label: "Generating insights", color: "purple" },
//     { label: "Finalizing results", color: "teal" },
//   ];

//   useEffect(() => {
//     const stateImage = location.state?.image;
//     if (stateImage) {
//       setImageSrc(stateImage);
//       analyzeImage(stateImage);
//     } else {
//       navigate("/", { replace: true });
//     }
//   }, [location.state]);

//   const analyzeImage = async (base64Image) => {
//     setIsAnalyzing(true);
//     setProgress(0);
//     setStepIndex(0);
//     setError(null);
//     setConfidence(null);
//     setWarnings([]);

//     try {
//       const stepPercent = 100 / steps.length;

//       // Animate each step individually
//       for (let i = 0; i < steps.length; i++) {
//         setStepIndex(i);
//         const start = 0;
//         const end = 100; // percentage per step

//         for (let j = 0; j <= 20; j++) {
//           setProgress(start + ((end - start) * j) / 20);
//           await new Promise((r) => setTimeout(r, 50));
//         }
//       }

//       // Compute hash and warnings
//       const uploaded = await getImageHash(base64Image);
//       setWarnings(uploaded.warnings);

//       // Fetch dishes
//       const { data: dishes, error: fetchError } = await supabase
//         .from("dishinfo")
//         .select(
//           `id,name,image_url,calories_value,protein_value,fat_value,carbs_value,ingredient,store,description`
//         );

//       if (fetchError) throw new Error(fetchError.message);
//       if (!dishes || dishes.length === 0)
//         throw new Error("No dishes found in database.");

//       // Find best match
//       let bestMatch = null;
//       let bestScore = -Infinity;

//       for (const dish of dishes) {
//         if (!dish.image_url) continue;
//         try {
//           const dishHashObj = await getImageHash(dish.image_url);
//           const phashDistance = hammingDistance(
//             uploaded.hash,
//             dishHashObj.hash
//           );
//           const phashScore = (64 - phashDistance) / 64;
//           const histScore = await compareHist(base64Image, dish.image_url);
//           const orbScore = await orbCompare(base64Image, dish.image_url);
//           const totalScore =
//             phashScore * 0.7 + histScore * 0.2 + orbScore * 0.1;

//           if (totalScore > bestScore) {
//             bestScore = totalScore;
//             bestMatch = dish;
//           }
//         } catch {}
//       }

//       if (!bestMatch) throw new Error("No matching dish found.");
//       const accuracy = (bestScore * 100).toFixed(2);
//       setConfidence(accuracy);

//       const { data: { user } = {} } = await supabase.auth.getUser();

//       await new Promise((r) => setTimeout(r, 800));

//       navigate("/result", {
//         state: {
//           dishId: bestMatch.id,
//           imageSrc: base64Image,
//           accuracy,
//           warnings: uploaded.warnings,
//           isLoggedIn: !!user,
//         },
//       });
//     } catch (err) {
//       navigate("/notfound", {
//         state: { imageSrc: base64Image, failReason: err.message, warnings },
//       });
//       setError(err.message);
//     } finally {
//       setIsAnalyzing(false);
//     }
//   };

//   return (
//     <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
//       <div className="w-[375px] h-[667px] rounded-xl shadow-2xl flex flex-col overflow-hidden bg-white p-4 relative">
//         {/* Scanning Image */}
//         <div className="relative w-full h-[260px] rounded-xl overflow-hidden flex items-center justify-center mb-6">
//           {imageSrc && (
//             <motion.img
//               src={imageSrc}
//               alt="Scanning"
//               className="object-cover w-full h-full rounded-xl shadow-inner"
//               animate={{ scale: isAnalyzing ? [1, 1.05, 1] : 1 }}
//               transition={{ duration: 2, repeat: Infinity }}
//             />
//           )}
//           {warnings.length > 0 && (
//             <div className="absolute inset-0 bg-red-400/30 flex flex-col items-center justify-center rounded-xl p-2">
//               {warnings.map((w, i) => (
//                 <p key={i} className="text-white font-semibold text-center">
//                   ⚠️ {w}
//                 </p>
//               ))}
//             </div>
//           )}
//           {isAnalyzing && warnings.length === 0 && (
//             <motion.div
//               className="absolute w-full h-full rounded-xl bg-gradient-to-r from-transparent via-green-300/40 to-transparent"
//               animate={{ x: ["-100%", "100%"] }}
//               transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
//             />
//           )}
//         </div>

//         {/* Single Circular Step Progress with percentage per step */}
//         <div className="flex flex-col items-center justify-center my-6">
//           <svg className="w-32 h-32" viewBox="0 0 128 128">
//             <circle
//               cx="64"
//               cy="64"
//               r="60"
//               stroke="#e2e8f0"
//               strokeWidth="8"
//               fill="none"
//             />
//             {steps.map((step, i) => {
//               const stepPercent = 100 / steps.length;
//               let segmentPercent = 0;

//               if (stepIndex > i) segmentPercent = stepPercent; // finished step
//               else if (stepIndex === i) segmentPercent = progress; // current step percentage

//               return (
//                 <motion.circle
//                   key={i}
//                   cx="64"
//                   cy="64"
//                   r="60"
//                   stroke={step.color}
//                   strokeWidth="8"
//                   fill="none"
//                   strokeDasharray={2 * Math.PI * 60 * (segmentPercent / 100)}
//                   strokeDashoffset={0}
//                   initial={{ strokeDasharray: 0 }}
//                   animate={{
//                     strokeDasharray: 2 * Math.PI * 60 * (segmentPercent / 100),
//                   }}
//                   transition={{ duration: 0.3, ease: "easeOut" }}
//                 />
//               );
//             })}

//             {/* Current Step Percentage in center */}
//             <text
//               x="50%"
//               y="50%"
//               dominantBaseline="middle"
//               textAnchor="middle"
//               className="text-lg font-bold fill-gray-700"
//             >
//               {stepIndex <= steps.length - 1 ? Math.round(progress) : 100}%
//             </text>
//           </svg>

//           {/* Step label below the circle */}
//           <p className="text-sm font-semibold mt-2">
//             {steps[stepIndex]?.label}
//           </p>
//         </div>

//         {/* Confidence Bar */}
//         {confidence && (
//           <div className="mt-6 px-2">
//             <p className="text-sm font-medium mb-1 text-gray-700">
//               Match Confidence: {confidence}%
//             </p>
//             <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
//               <motion.div
//                 className="h-3 bg-green-500 rounded-full"
//                 initial={{ width: 0 }}
//                 animate={{ width: `${confidence}%` }}
//                 transition={{ duration: 1.2, ease: "easeOut" }}
//               />
//             </div>
//           </div>
//         )}

//         {error && (
//           <p className="text-red-600 font-semibold mt-4 text-center px-4">
//             {error}
//           </p>
//         )}
//       </div>
//     </div>
//   );
// }

// =====================================================================================================================================

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import cacheService from "../services/cacheService";

const getImageHash = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const size = 8;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size).data;

      let grayscale = [];
      let totalBrightness = 0;
      for (let i = 0; i < imageData.length; i += 4) {
        const gray =
          0.299 * imageData[i] +
          0.587 * imageData[i + 1] +
          0.114 * imageData[i + 2];
        grayscale.push(gray);
        totalBrightness += gray;
      }

      const avgBrightness = totalBrightness / grayscale.length;
      if (avgBrightness < 30) {
        reject(new Error("TOO_DARK"));
        return;
      }

      const avg =
        grayscale.reduce((sum, val) => sum + val, 0) / grayscale.length;
      const hash = grayscale.map((val) => (val > avg ? "1" : "0")).join("");
      resolve({ hash, brightness: avgBrightness });
    };
    img.onerror = () => reject(new Error("FAILED_LOAD"));
    img.src = src;
  });

const hammingDistance = (hash1, hash2) => {
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) if (hash1[i] !== hash2[i]) dist++;
  return dist;
};

// These functions are now handled by the Edge Function

export default function AnalyzePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [imageSrc, setImageSrc] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const steps = [
    "Analyzing...",
    "Identifying dish components",
    "Calculating nutrition facts",
    "Generating insights",
    "This may take a few seconds...",
  ];

  useEffect(() => {
    const stateImage = location.state?.image;
    if (stateImage) {
      setImageSrc(stateImage);
      analyzeImage(stateImage);
    } else {
      navigate("/", { replace: true });
    }
  }, [location.state]);

  const analyzeImage = async (base64Image) => {
    setIsAnalyzing(true);
    setError(null);
    setStepIndex(0);
    setProgress(0);

    try {
      // Temporarily disable caching to test real processing
      // const cachedResult = cacheService.getCachedScanResult(base64Image);
      // if (cachedResult) {
      //   console.log('Using cached result');
      //   setStepIndex(steps.length - 1);
      //   setProgress(100);
      //
      //   const { data: { user } } = await supabase.auth.getUser();
      //   navigate("/result", {
      //     state: {
      //       dishId: cachedResult.bestMatch.id,
      //       imageSrc: base64Image,
      //       accuracy: cachedResult.bestMatch.confidence,
      //       allMatches: cachedResult.matches,
      //       isLoggedIn: !!user,
      //     },
      //   });
      //   return;
      // }

      // Real-time progress without artificial delays
      for (let i = 0; i < steps.length; i++) {
        setStepIndex(i);
        setProgress(Math.round(((i + 1) / steps.length) * 100));
        // Small delay for UI smoothness only
        await new Promise((r) => setTimeout(r, 100));
      }

      // Call the Edge Function for server-side processing
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-dish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            imageData: base64Image,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      const bestMatch = result.bestMatch;
      if (!bestMatch) {
        throw new Error("No matching dish found.");
      }

      // Cache the result for future use
      cacheService.cacheScanResult(base64Image, result);

      navigate("/result", {
        state: {
          dishId: bestMatch.id,
          imageSrc: base64Image,
          accuracy: bestMatch.confidence,
          allMatches: result.matches,
          isLoggedIn: !!user,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-50 p-4">
      <div className="w-[380px] h-[680px] rounded-2xl shadow-2xl p-6 flex flex-col overflow-hidden bg-white relative">
        {/* Image Preview */}
        <div className="relative w-full h-[250px] rounded-xl overflow-hidden flex items-center justify-center mb-5 shadow-md">
          {imageSrc && (
            <img
              src={imageSrc}
              alt="Scanned"
              className="w-full h-full object-cover rounded-xl"
            />
          )}
          {isAnalyzing && (
            <motion.div
              className="absolute left-0 w-full h-[3px] bg-green-600/90 blur-md shadow-xl"
              style={{ top: 0 }}
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </div>

        {/* Progress Circle + Step */}
        {isAnalyzing && (
          <div className="flex flex-col items-center flex-grow justify-center gap-6 relative -mt-8">
            {/* Circle */}
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="50"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <motion.circle
                  cx="56"
                  cy="56"
                  r="50"
                  stroke="#22c55e"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - progress / 100)}
                  initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 50 * (1 - progress / 100),
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-bold text-green-600 text-xl">
                {progress}%
              </span>
            </div>

            {/* Step Text */}
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-center text-gray-800 font-medium text-sm"
            >
              {steps[stepIndex]}
            </motion.div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-600 font-semibold mt-4 text-center px-3">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
