// import { useState } from "react";
// import { useNavigate } from "react-router-dom"; // <-- import useNavigate

// const faqs = [
//   {
//     question: "What is Smart Genie?",
//     answer:
//       "Smart Genie is a smart recipe and meal planning app that suggests meals based on your preferences, health goals, and available ingredients.",
//   },
//   {
//     question: "Is Smart Genie free?",
//     answer:
//       "Yes! You can access many features for free. Premium features like personalized meal plans may require a subscription.",
//   },
//   {
//     question: "Which devices support Smart Genie?",
//     answer:
//       "Smart Genie is available on web and mobile devices. You can access it through your browser or install the mobile app.",
//   },
//   {
//     question: "Can I filter recipes by dietary restrictions?",
//     answer:
//       "Absolutely! You can filter recipes for allergies, dietary preferences (like vegan or keto), and health conditions.",
//   },
//   {
//     question: "How do I save my favorite recipes?",
//     answer:
//       "Simply click the 'Save' button on any recipe. Your saved recipes will appear in the 'Favorites' section for quick access.",
//   },
// ];

// export default function FAQ() {
//   const [openIndex, setOpenIndex] = useState(null);
//   const navigate = useNavigate(); // <-- initialize navigate

//   const toggleFAQ = (index) => {
//     setOpenIndex(openIndex === index ? null : index);
//   };

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
//             FAQ
//           </div>
//           {/* Placeholder to balance the flex */}
//           <div className="w-[40px]"></div>
//         </div>

//         {/* FAQ Content */}
//         <div className="p-4 flex-1 overflow-auto space-y-3">
//           {faqs.map((faq, index) => (
//             <div
//               key={index}
//               className="border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition"
//             >
//               <button
//                 className="w-full text-left flex justify-between items-center font-medium text-gray-800 focus:outline-none"
//                 onClick={() => toggleFAQ(index)}
//               >
//                 <span>{faq.question}</span>
//                 <span className="text-blue-600 text-lg font-bold">
//                   {openIndex === index ? "−" : "+"}
//                 </span>
//               </button>
//               {openIndex === index && (
//                 <p className="mt-2 text-gray-600 text-sm">{faq.answer}</p>
//               )}
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// ==============================================================================================================================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronDown, FiChevronUp, FiArrowLeft } from "react-icons/fi";

const faqs = [
  {
    question: "What is Smart Genie?",
    answer:
      "Smart Genie is a smart recipe and meal planning app that suggests meals based on your preferences, health goals, and available ingredients.",
  },
  {
    question: "Is Smart Genie free?",
    answer:
      "Yes! You can access many features for free. Premium features like personalized meal plans may require a subscription.",
  },
  {
    question: "Which devices support Smart Genie?",
    answer:
      "Smart Genie is available on web and mobile devices. You can access it through your browser or install the mobile app.",
  },
  {
    question: "Can I filter recipes by dietary restrictions?",
    answer:
      "Absolutely! You can filter recipes for allergies, dietary preferences (like vegan or keto), and health conditions.",
  },
  {
    question: "How do I save my favorite recipes?",
    answer:
      "Simply click the 'Save' button on any recipe. Your saved recipes will appear in the 'Favorites' section for quick access.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);
  const navigate = useNavigate();

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
          <div className="font-bold text-lg">FAQ</div>
          <div className="w-6"></div>
        </div>

        {/* FAQ Content */}
        <div className="p-5 flex-1 overflow-auto space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
            >
              <button
                className="w-full flex justify-between items-center font-medium text-green-900 focus:outline-none"
                onClick={() => toggleFAQ(index)}
              >
                <span>{faq.question}</span>
                <span className="text-green-600 text-xl">
                  {openIndex === index ? <FiChevronUp /> : <FiChevronDown />}
                </span>
              </button>
              {openIndex === index && (
                <p className="mt-3 text-green-800 text-sm leading-relaxed">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
