// import { useNavigate } from "react-router-dom";

// export default function Disclaimer() {
//   const navigate = useNavigate();

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 flex items-center justify-center px-4 py-6">
//       <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl overflow-auto flex flex-col">
//         {/* Header */}
//         <div className="bg-blue-400 p-4 rounded-t-2xl text-white shadow flex items-center">
//           {/* Back Button */}
//           <button
//             onClick={() => navigate("/settings")}
//             className="text-white text-sm"
//           >
//             Back
//           </button>
//           {/* FAQ Title */}
//           <div className="flex-1 text-center font-semibold text-white text-sm">
//             Disclaimer
//           </div>
//           {/* Placeholder to balance the flex */}
//           <div className="w-[40px]"></div>
//         </div>

//         {/* Disclaimer Content */}
//         <div className="p-4 flex-1 overflow-auto space-y-4 text-gray-700 text-sm">
//           <h2 className="font-semibold text-gray-800">
//             1. General Information
//           </h2>
//           <p>
//             The content provided in Smart Genie is for general informational
//             purposes only. While we strive to provide accurate and up-to-date
//             information, we make no guarantees about the completeness,
//             reliability, or accuracy of any content.
//           </p>

//           <h2 className="font-semibold text-gray-800">2. Not Medical Advice</h2>
//           <p>
//             Smart Genie is not a substitute for professional medical advice,
//             diagnosis, or treatment. Always consult your physician or other
//             qualified health provider with any questions regarding a medical
//             condition or dietary needs.
//           </p>

//           <h2 className="font-semibold text-gray-800">3. No Liability</h2>
//           <p>
//             By using this app, you agree that Smart Genie and its developers are
//             not liable for any direct, indirect, incidental, or consequential
//             damages resulting from the use of the app, including health
//             outcomes, data loss, or other issues.
//           </p>

//           <h2 className="font-semibold text-gray-800">4. External Links</h2>
//           <p>
//             Smart Genie may contain links to third-party websites or resources.
//             We are not responsible for the content or practices of these
//             external sites.
//           </p>

//           <h2 className="font-semibold text-gray-800">
//             5. User Responsibility
//           </h2>
//           <p>
//             Users are responsible for their own actions and decisions based on
//             the information provided by the app. Always exercise caution and
//             good judgment.
//           </p>

//           <h2 className="font-semibold text-gray-800">
//             6. Changes to Disclaimer
//           </h2>
//           <p>
//             We may update this disclaimer at any time without prior notice.
//             Continued use of the app constitutes acceptance of the updated
//             disclaimer.
//           </p>

//           <h2 className="font-semibold text-gray-800">7. Contact</h2>
//           <p>
//             For questions or concerns regarding this disclaimer, please contact
//             us through the Contact Us page in the app.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }


// ================================================================================================================================================================


import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function Disclaimer() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200 flex items-center justify-center px-4 py-6">
      <div className="bg-white w-[380px] h-[720px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-green-100">
        {/* Header */}
        <div className="bg-green-600 p-5 rounded-t-3xl text-white shadow-lg flex items-center justify-between">
          <button
            onClick={() => navigate("/settings")}
            className="text-white text-lg p-1 hover:bg-green-500 rounded transition"
          >
            <FiArrowLeft />
          </button>
          <div className="font-bold text-lg">Disclaimer</div>
          <div className="w-6"></div>
        </div>

        {/* Disclaimer Content */}
        <div
          className="p-5 flex-1 space-y-5 text-gray-700 text-sm overflow-y-auto scrollbar-hide"
          style={{
            scrollbarWidth: "none", // Firefox
            msOverflowStyle: "none", // IE and Edge
          }}
        >
          {/* Hide scrollbar for WebKit browsers */}
          <style>
            {`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">1. General Information</h2>
            <p>
              The content provided in Smart Genie is for general informational purposes only. While we strive to provide accurate and up-to-date information, we make no guarantees about the completeness, reliability, or accuracy of any content.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">2. Not Medical Advice</h2>
            <p>
              Smart Genie is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your physician or other qualified health provider with any questions regarding a medical condition or dietary needs.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">3. No Liability</h2>
            <p>
              By using this app, you agree that Smart Genie and its developers are not liable for any direct, indirect, incidental, or consequential damages resulting from the use of the app, including health outcomes, data loss, or other issues.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">4. External Links</h2>
            <p>
              Smart Genie may contain links to third-party websites or resources. We are not responsible for the content or practices of these external sites.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">5. User Responsibility</h2>
            <p>
              Users are responsible for their own actions and decisions based on the information provided by the app. Always exercise caution and good judgment.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">6. Changes to Disclaimer</h2>
            <p>
              We may update this disclaimer at any time without prior notice. Continued use of the app constitutes acceptance of the updated disclaimer.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">7. Contact</h2>
            <p>
              For questions or concerns regarding this disclaimer, please contact us through the Contact Us page in the app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
