export function calculateHealth({
  birthMonth,
  birthYear,
  gender,
  heightUnit,
  heightCm,
  heightFt,
  heightIn,
  weightUnit,
  weight,
  activityLevel,
}) {
  // Calculate age
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  let age = currentYear - parseInt(birthYear);
  if (currentMonth < parseInt(birthMonth)) age--;

  // Enforce minimum age
  if (age < 15) {
    throw new Error("User must be at least 15 years old.");
  }

  // Height in meters
  let heightInMeters = 0;
  if (heightUnit === "cm") {
    heightInMeters = parseFloat(heightCm) / 100;
  } else {
    const totalInches = parseFloat(heightFt || 0) * 12 + parseFloat(heightIn || 0);
    heightInMeters = totalInches * 0.0254;
  }

  // Weight in kg
  const weightKg = weightUnit === "kg" ? parseFloat(weight) : parseFloat(weight) * 0.453592;

  // BMI
  const bmi = weightKg / (heightInMeters * heightInMeters);

  let bmiStatus = "";
  if (bmi < 18.5) {
    bmiStatus = "Underweight";
  } else if (bmi >= 18.5 && bmi < 24.9) {
    bmiStatus = "Normal weight";
  } else if (bmi >= 25 && bmi < 29.9) {
    bmiStatus = "Overweight";
  } else {
    bmiStatus = "Obese";
  }

  // BMR
  let bmr = 0;
  if (gender === "Male") {
    bmr = 10 * weightKg + 6.25 * heightInMeters * 100 - 5 * age + 5;
  } else if (gender === "Female") {
    bmr = 10 * weightKg + 6.25 * heightInMeters * 100 - 5 * age - 161;
  }

  // Activity factor
  const activityFactors = {
    Sedentary: 1.2,
    "Lightly active": 1.375,
    "Moderately active": 1.55,
    "Very active": 1.725,
  };

  const caloriesNeeded = Math.round(bmr * (activityFactors[activityLevel] || 1.2));

  // Calculate fat grams assuming 30% calories from fat
  const fatGrams = Math.round((caloriesNeeded * 0.3) / 9);

  return {
    age,
    bmi: bmi.toFixed(1),
    bmiStatus,
    caloriesNeeded,
    fatGrams,        // Added fat grams here
  };
}
