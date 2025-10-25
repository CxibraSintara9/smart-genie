// import { useNavigate } from "react-router-dom";

// export default function TermsAndConditions() {
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
//             Terms & Conditions
//           </div>
//           {/* Placeholder to balance the flex */}
//           <div className="w-[40px]"></div>
//         </div>

//         {/* Terms Content */}
//         <div className="p-4 flex-1 overflow-auto space-y-4 text-gray-700 text-sm">
//           <h2 className="font-semibold text-gray-800">1. Introduction</h2>
//           <p>
//             Welcome to Smart Genie. By accessing or using this app, you agree to
//             be bound by these terms and conditions.
//           </p>

//           <h2 className="font-semibold text-gray-800">2. Use of the App</h2>
//           <p>
//             You agree to use Smart Genie for personal, non-commercial purposes
//             only. Any misuse of the app, including sharing copyrighted material
//             or harmful content, is strictly prohibited.
//           </p>

//           <h2 className="font-semibold text-gray-800">3. User Accounts</h2>
//           <p>
//             Users may need to create an account to access certain features. Keep
//             your login information secure and notify us of any unauthorized
//             access.
//           </p>

//           <h2 className="font-semibold text-gray-800">4. Privacy</h2>
//           <p>
//             Your personal information will be handled according to our Privacy
//             Policy. By using the app, you consent to the collection and use of
//             your data as described.
//           </p>

//           <h2 className="font-semibold text-gray-800">
//             5. Intellectual Property
//           </h2>
//           <p>
//             All content, recipes, images, and trademarks on Smart Genie are the
//             property of the app or its licensors. You may not copy, modify, or
//             distribute content without permission.
//           </p>

//           <h2 className="font-semibold text-gray-800">
//             6. Limitation of Liability
//           </h2>
//           <p>
//             Smart Genie is provided “as is.” We are not responsible for any
//             damages, including health-related outcomes or loss of data,
//             resulting from using the app.
//           </p>

//           <h2 className="font-semibold text-gray-800">7. Changes to Terms</h2>
//           <p>
//             We may update these Terms & Conditions at any time. Continued use of
//             the app constitutes acceptance of the updated terms.
//           </p>

//           <h2 className="font-semibold text-gray-800">8. Contact Us</h2>
//           <p>
//             For questions regarding these terms, please contact us via the
//             Contact Us page in the app.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// =====================================================================================================================================


import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function TermsAndConditions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200 flex items-center justify-center px-4 py-6">
      <div className="bg-white w-[380px] h-[720px] rounded-3xl shadow-2xl overflow-auto flex flex-col border border-green-100">
        {/* Header */}
        <div className="bg-green-600 p-5 rounded-t-3xl text-white shadow-lg flex items-center justify-between">
          <button
            onClick={() => navigate("/settings")}
            className="text-white text-lg p-1 hover:bg-green-500 rounded transition"
          >
            <FiArrowLeft />
          </button>
          <div className="font-bold text-lg">Terms & Conditions</div>
          <div className="w-6"></div>
        </div>

        {/* Terms Content */}
        <div className="p-5 flex-1 overflow-auto space-y-5 text-gray-700 text-sm">
          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">1. Introduction</h2>
            <p>
              Welcome to Smart Genie. By accessing or using this app, you agree to
              be bound by these terms and conditions.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">2. Use of the App</h2>
            <p>
              You agree to use Smart Genie for personal, non-commercial purposes
              only. Any misuse of the app, including sharing copyrighted material
              or harmful content, is strictly prohibited.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">3. User Accounts</h2>
            <p>
              Users may need to create an account to access certain features. Keep
              your login information secure and notify us of any unauthorized
              access.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">4. Privacy</h2>
            <p>
              Your personal information will be handled according to our Privacy
              Policy. By using the app, you consent to the collection and use of
              your data as described.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">5. Intellectual Property</h2>
            <p>
              All content, recipes, images, and trademarks on Smart Genie are the
              property of the app or its licensors. You may not copy, modify, or
              distribute content without permission.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">6. Limitation of Liability</h2>
            <p>
              Smart Genie is provided “as is.” We are not responsible for any
              damages, including health-related outcomes or loss of data,
              resulting from using the app.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">7. Changes to Terms</h2>
            <p>
              We may update these Terms & Conditions at any time. Continued use of
              the app constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="bg-green-50 p-4 rounded-xl shadow-sm">
            <h2 className="font-semibold text-green-800 mb-2">8. Contact Us</h2>
            <p>
              For questions regarding these terms, please contact us via the
              Contact Us page in the app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
