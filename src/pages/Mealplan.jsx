// Mealplan.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaUtensils } from "react-icons/fa";
import FooterNav from "../components/FooterNav";

export default function Mealplan({ userId }) {
  const [profile, setProfile] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [mealLog, setMealLog] = useState([]);
  const [weeklyPlan, setWeeklyPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedDish, setSelectedDish] = useState(null);

  const navigate = useNavigate();

  // -------------------- Fetch Data (Optimized) --------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return navigate("/login");

      // Batch database queries for better performance
      const [profileResult, dishesResult, mealResult] = await Promise.all([
        supabase
          .from("health_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase.from("dishes").select(`
          id, name, description, default_serving, meal_type, goal,
          eating_style, health_condition, steps,
          ingredients_dish_id_fkey(id, name, amount, unit, calories, protein, fats, carbs, is_rice)
        `),
        supabase
          .from("meal_logs")
          .select("*")
          .eq("user_id", user.id)
      ]);

      const profileData = profileResult.data;
      const dishesData = dishesResult.data || [];
      const mealData = mealResult.data || [];

      if (!profileData) {
        setAlertMessage("Please complete your health profile first");
        setShowAlertModal(true);
        navigate("/healthprofile");
        return;
      }
      setProfile(profileData);
      setDishes(dishesData);
      setMealLog(mealData);

      // --- 🧠 Check if we need to regenerate the plan based on timeframe ---
      const savedPlan = localStorage.getItem(`weeklyPlan_${user.id}`);
      let plan = null;
      let needsNewPlan = true;

      if (savedPlan) {
        try {
          plan = JSON.parse(savedPlan);
          // Check if the saved plan matches the user's timeframe
          if (plan && plan.length === profileData.timeframe) {
            needsNewPlan = false;
          }
        } catch {
          plan = null;
        }
      }

      if (needsNewPlan) {
        plan = createSmartWeeklyMealPlan(profileData, dishesData);
        localStorage.setItem(`weeklyPlan_${user.id}`, JSON.stringify(plan));
      }

      // Update weeklyPlan to mark any dishes that are already in meal logs
      const updated = markAddedMeals(plan || [], mealData);
      setWeeklyPlan(updated);
      
      // persist the marked plan
      try {
        localStorage.setItem(
          `weeklyPlan_${user.id}`,
          JSON.stringify(updated)
        );
      } catch {}
    } catch (error) {
      console.error("Error fetching data:", error);
      setAlertMessage("An error occurred while loading your meal plan");
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------- Helper: calculate nutrition per dish (Memoized) --------------------
  const calculateDishNutrition = useCallback((dish) => {
    const ingredients = dish.ingredients_dish_id_fkey || dish.ingredients || [];
    if (!ingredients?.length)
      return { calories: 0, protein: 0, fat: 0, carbs: 0 };

    return ingredients.reduce(
      (totals, ingredient) => ({
        calories: totals.calories + (ingredient.calories || 0),
        protein: totals.protein + (ingredient.protein || 0),
        fat: totals.fat + (ingredient.fats || 0),
        carbs: totals.carbs + (ingredient.carbs || 0),
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );
  }, []);

  // Compute dish totals (scaled from DB per-100g) and apply deltas for any
  // ingredients that have custom amounts (e.g., rice). Ingredient base values
  // are expressed per 100g of ingredient; ingredient.baseAmount is grams of
  // ingredient per 100g of dish. When customAmount is set, ingredient.amount
  // is treated as grams for the current serving and used to compute its
  // contribution. (Memoized for Performance)
  const computeDishTotalsWithIngredientOverrides = useCallback((dish) => {
    if (!dish) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    // amountBaseUnit is the grams basis used for ingredient.baseAmount.
    // It can be 100 (per-100g) or the dish.default_serving if the DB stores
    // ingredient amounts per dish serving. Default to 100 if not present.
    const baseline = dish.amountBaseUnit || 100;
    const scale = (dish.servingSize || baseline) / baseline;

    // scaled dish totals from DB (per amountBaseUnit baseline)
    const scaledCalories = (dish.base_total_calories || 0) * scale;
    const scaledProtein = (dish.base_total_protein || 0) * scale;
    const scaledCarbs = (dish.base_total_carbs || 0) * scale;
    const scaledFats = (dish.base_total_fats || 0) * scale;

    // compute delta from ingredient overrides (only for ingredients with customAmount)
    let deltaCalories = 0;
    let deltaProtein = 0;
    let deltaCarbs = 0;
    let deltaFats = 0;

    const ingredients = dish.ingredients_dish_id_fkey || [];
    for (const ing of ingredients) {
      // storedAmount is the grams stored in DB for amountBaseUnit
      const storedAmount = ing.storedAmount || 0;
      const caloriesPerGram = ing.caloriesPerGram || 0;
      const proteinPerGram = ing.proteinPerGram || 0;
      const carbsPerGram = ing.carbsPerGram || 0;
      const fatsPerGram = ing.fatsPerGram || 0;

      // defaultDisplayAmount is how many grams of this ingredient are used
      // for the current servingSize based on the baseline unit.
      const defaultDisplayAmount = +(storedAmount * scale);

      // default contribution from this ingredient (for current serving)
      const defaultCalories = caloriesPerGram * defaultDisplayAmount;
      const defaultProtein = proteinPerGram * defaultDisplayAmount;
      const defaultCarbs = carbsPerGram * defaultDisplayAmount;
      const defaultFats = fatsPerGram * defaultDisplayAmount;

      if (ing.customAmount) {
        // custom amount is in grams for the ingredient in the current serving
        const customAmt = ing.amount || 0;
        const customCalories = caloriesPerGram * customAmt;
        const customProtein = proteinPerGram * customAmt;
        const customCarbs = carbsPerGram * customAmt;
        const customFats = fatsPerGram * customAmt;

        deltaCalories += customCalories - defaultCalories;
        deltaProtein += customProtein - defaultProtein;
        deltaCarbs += customCarbs - defaultCarbs;
        deltaFats += customFats - defaultFats;
      }
    }

    return {
      calories: +(scaledCalories + deltaCalories).toFixed(2),
      protein: +(scaledProtein + deltaProtein).toFixed(2),
      carbs: +(scaledCarbs + deltaCarbs).toFixed(2),
      fats: +(scaledFats + deltaFats).toFixed(2),
    };
  }, []);

  // Mark meals in the weekly plan that have already been logged by the user.
  // We treat a meal as "added" if its dish id appears in the user's meal logs.
  // Returns a new weeklyPlan array with meal.added === true for such meals. (Memoized)
  const markAddedMeals = useCallback((plan = [], mealLog = []) => {
    if (!Array.isArray(plan) || !Array.isArray(mealLog)) return plan || [];

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const localDate =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");

    return (plan || []).map((day) => {
      const meals = (day.meals || []).map((meal) => {
        const idNum = Number(meal?.id);
        // Check if this specific dish + meal type combination exists in today's meal logs
        const isAdded = (mealLog || []).some(
          (m) =>
            Number(m.dish_id) === idNum &&
            m.meal_type === meal.type &&
            m.meal_date === localDate
        );
        return { ...(meal || {}), added: isAdded };
      });
      return { ...day, meals };
    });
  }, []);

  // Prepare dish object for modal: add base fields and scaled fields
  const prepareDishForModal = (dish) => {
    // Determine whether ingredient.amount values are stored per 100g of dish
    // or per the dish.default_serving. We infer this by summing raw amounts
    // and seeing which baseline (100 or default_serving) is closer.
    const rawIngredients = dish.ingredients_dish_id_fkey || [];
    const sumBase = rawIngredients.reduce((s, i) => s + (i.amount || 0), 0);

    const defaultServing = 100; // UI default baseline
    let amountBaseUnit = 100;
    if (dish.default_serving) {
      if (Math.abs(sumBase - dish.default_serving) < Math.abs(sumBase - 100)) {
        amountBaseUnit = dish.default_serving;
      }
    }

    // If caller already provided an amountBaseUnit prefer it
    if (dish.amountBaseUnit) amountBaseUnit = dish.amountBaseUnit;

    const servingSize = dish.servingSize || defaultServing;

    console.debug(
      "prepareDishForModal - rawIngredients:",
      rawIngredients,
      "amountBaseUnit:",
      amountBaseUnit,
      "servingSize:",
      servingSize
    );
    // Interpret the DB ingredient fields (calories/protein/carbs/fats) as the
    // total contribution for the stored ingredient amount (`amount`). To keep
    // the modal totals identical to the daily totals (which sum raw
    // ingredient contribution fields), compute per-gram rates from the DB
    // contribution and use those to scale when serving size changes or when
    // the user edits an ingredient (rice).
    const ingredients = rawIngredients.map((ing) => {
      const storedAmount = ing.amount || 0; // grams stored in DB for the ingredient (per amountBaseUnit)
      const totalCaloriesForStored = ing.calories || 0; // contribution for storedAmount
      const totalProteinForStored = ing.protein || 0;
      const totalCarbsForStored = ing.carbs || 0;
      const totalFatsForStored = ing.fats || 0;

      // per-gram contribution rates (guard against divide-by-zero)
      const caloriesPerGram =
        storedAmount > 0 ? totalCaloriesForStored / storedAmount : 0;
      const proteinPerGram =
        storedAmount > 0 ? totalProteinForStored / storedAmount : 0;
      const carbsPerGram =
        storedAmount > 0 ? totalCarbsForStored / storedAmount : 0;
      const fatsPerGram =
        storedAmount > 0 ? totalFatsForStored / storedAmount : 0;

      // Compute displayed ingredient amount for current servingSize using amountBaseUnit
      const displayAmount = +(
        storedAmount *
        (servingSize / amountBaseUnit)
      ).toFixed(2);

      // Contribution for the displayed amount (using per-gram rates)
      const displayCalories = +(caloriesPerGram * displayAmount).toFixed(2);
      const displayProtein = +(proteinPerGram * displayAmount).toFixed(2);
      const displayCarbs = +(carbsPerGram * displayAmount).toFixed(2);
      const displayFats = +(fatsPerGram * displayAmount).toFixed(2);

      return {
        ...ing,
        // store the DB raw storedAmount and total contribution values
        storedAmount,
        totalCaloriesForStored,
        totalProteinForStored,
        totalCarbsForStored,
        totalFatsForStored,
        // per-gram rates for easy recomputation
        caloriesPerGram,
        proteinPerGram,
        carbsPerGram,
        fatsPerGram,
        // amount and nutrient fields reflect the contribution for current servingSize
        amount: displayAmount,
        calories: displayCalories,
        protein: displayProtein,
        carbs: displayCarbs,
        fats: displayFats,
        customAmount: false,
      };
    });

    // Compute authoritative base dish totals from ingredients (per amountBaseUnit of dish)
    let base_total_calories = 0;
    let base_total_protein = 0;
    let base_total_carbs = 0;
    let base_total_fats = 0;

    // Sum the DB-provided contribution totals for the stored ingredient amounts
    // to create authoritative base totals for the dish (per amountBaseUnit).
    for (const ing of ingredients) {
      base_total_calories += ing.totalCaloriesForStored || 0;
      base_total_protein += ing.totalProteinForStored || 0;
      base_total_carbs += ing.totalCarbsForStored || 0;
      base_total_fats += ing.totalFatsForStored || 0;
    }

    const scale = servingSize / amountBaseUnit;

    return {
      ...dish,
      servingSize,
      default_serving: defaultServing,
      amountBaseUnit,
      base_total_calories: +base_total_calories.toFixed(2),
      base_total_protein: +base_total_protein.toFixed(2),
      base_total_carbs: +base_total_carbs.toFixed(2),
      base_total_fats: +base_total_fats.toFixed(2),
      total_calories: +(base_total_calories * scale).toFixed(2),
      total_protein: +(base_total_protein * scale).toFixed(2),
      total_carbs: +(base_total_carbs * scale).toFixed(2),
      total_fats: +(base_total_fats * scale).toFixed(2),
      ingredients_dish_id_fkey: ingredients,
      db_raw_ingredients: rawIngredients,
    };
  };

  const handleOpenDish = (dish) => {
    // dish may come from weeklyPlan and may not include full ingredient objects
    // find full dish from dishes list if available
    const full = dishes.find((d) => d.id === dish.id) || dish;
    const prepared = prepareDishForModal(full);
    // If this was opened from the weekly plan, the meal object includes a
    // `type` field (e.g. "Breakfast", "Lunch", "Dinner") which should be
    // used when logging the meal. Preserve it on the prepared dish so
    // handleAddMeal can use the plan's meal type instead of the DB's meal_type
    // (which may be an array like ['lunch','dinner']).
    if (dish && dish.type) prepared.planMealType = dish.type;
    else if (dish && dish.meal_type) prepared.planMealType = dish.meal_type;

    setSelectedDish(prepared);
  };

  const handleServingSizeChange = (newSize) => {
    setSelectedDish((prev) => {
      if (!prev) return prev;

      // Use the ingredient amount baseline (either 100 or dish.default_serving)
      const baseline = prev.amountBaseUnit || 100;
      const scale = newSize / baseline;

      // Do NOT modify ingredient amounts/nutrition on serving size change.
      // Update servingSize and scale all dish-level totals from their base values.
      const newTotalCalories = +(
        (prev.base_total_calories || 0) * scale
      ).toFixed(2);
      const newTotalProtein = +((prev.base_total_protein || 0) * scale).toFixed(
        2
      );
      const newTotalCarbs = +((prev.base_total_carbs || 0) * scale).toFixed(2);
      const newTotalFats = +((prev.base_total_fats || 0) * scale).toFixed(2);

      // Update ingredient display amounts/nutrition for non-custom ingredients.
      const ingredients = (prev.ingredients_dish_id_fkey || []).map((ing) => {
        // If user manually edited this ingredient amount, preserve it.
        if (ing.customAmount) {
          // Recompute nutrition from the edited amount (amount is grams)
          const calories = +(
            (ing.caloriesPerGram || 0) * (ing.amount || 0)
          ).toFixed(2);
          const protein = +(
            (ing.proteinPerGram || 0) * (ing.amount || 0)
          ).toFixed(2);
          const carbs = +((ing.carbsPerGram || 0) * (ing.amount || 0)).toFixed(
            2
          );
          const fats = +((ing.fatsPerGram || 0) * (ing.amount || 0)).toFixed(2);
          return { ...ing, calories, protein, carbs, fats };
        }

        // For non-custom ingredients, scale the stored amount by serving size
        const displayAmount = +((ing.storedAmount || 0) * scale).toFixed(2);
        const calories = +((ing.caloriesPerGram || 0) * displayAmount).toFixed(
          2
        );
        const protein = +((ing.proteinPerGram || 0) * displayAmount).toFixed(2);
        const carbs = +((ing.carbsPerGram || 0) * displayAmount).toFixed(2);
        const fats = +((ing.fatsPerGram || 0) * displayAmount).toFixed(2);
        return {
          ...ing,
          amount: displayAmount,
          calories,
          protein,
          carbs,
          fats,
        };
      });

      // compute adjusted totals including rice/ingredient overrides
      const adjusted = computeDishTotalsWithIngredientOverrides({
        ...prev,
        servingSize: newSize,
        base_total_calories: prev.base_total_calories,
        base_total_protein: prev.base_total_protein,
        base_total_carbs: prev.base_total_carbs,
        base_total_fats: prev.base_total_fats,
        ingredients_dish_id_fkey: ingredients,
      });

      return {
        ...prev,
        servingSize: newSize,
        total_calories: adjusted.calories,
        total_protein: adjusted.protein,
        total_carbs: adjusted.carbs,
        total_fats: adjusted.fats,
        ingredients_dish_id_fkey: ingredients,
      };
    });
  };

  const handleIngredientAmountChange = (ingredientId, newAmountRaw) => {
    const newAmount = Number(newAmountRaw) || 0;

    setSelectedDish((prev) => {
      if (!prev) return prev;

      const ingredients = (prev.ingredients_dish_id_fkey || []).map((ing) => {
        if (ing.id !== ingredientId) return ing;
        // newAmount is grams for the ingredient in the current serving
        const calories = +((ing.caloriesPerGram || 0) * newAmount).toFixed(2);
        const protein = +((ing.proteinPerGram || 0) * newAmount).toFixed(2);
        const carbs = +((ing.carbsPerGram || 0) * newAmount).toFixed(2);
        const fats = +((ing.fatsPerGram || 0) * newAmount).toFixed(2);
        return {
          ...ing,
          amount: +newAmount,
          calories,
          protein,
          carbs,
          fats,
          customAmount: true,
        };
      });

      // Recompute dish totals to include any rice customizations
      const dishWithNewIngredients = {
        ...prev,
        ingredients_dish_id_fkey: ingredients,
      };
      const adjusted = computeDishTotalsWithIngredientOverrides(
        dishWithNewIngredients
      );

      // Also update the weeklyPlan so any day that references this dish
      // shows updated daily totals based on the ingredient-adjusted dish totals.
      setWeeklyPlan((wp) => {
        if (!wp || !wp.length) return wp;
        return wp.map((day) => {
          let changed = false;
          const meals = (day.meals || []).map((meal) => {
            if (meal && meal.id && meal.id === prev.id) {
              changed = true;
              // Attach adjusted totals to the meal so day totals can use them
              return {
                ...meal,
                total_calories: adjusted.calories,
                total_protein: adjusted.protein,
                total_carbs: adjusted.carbs,
                total_fats: adjusted.fats,
              };
            }
            return meal;
          });

          if (!changed) return day;

          // Recompute day's aggregate totals from meal.total_* values (fall back to calculateDishNutrition)
          const totals = meals.reduce(
            (acc, m) => {
              const c = Number(m.total_calories || 0);
              const p = Number(m.total_protein || 0);
              const cb = Number(m.total_carbs || 0);
              const f = Number(m.total_fats || 0);
              return {
                calories: acc.calories + c,
                protein: acc.protein + p,
                carbs: acc.carbs + cb,
                fat: acc.fat + f,
              };
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );

          return { ...day, meals, totals };
        });
      });

      return {
        ...dishWithNewIngredients,
        total_calories: adjusted.calories,
        total_protein: adjusted.protein,
        total_carbs: adjusted.carbs,
        total_fats: adjusted.fats,
      };
    });
  };

  // -------------------- Filter dishes based on profile --------------------
  const getSuggestedDishes = (profile, dishes, searchQuery = "") => {
    if (!profile || !dishes?.length) return [];

    // --- User preferences ---
    let userAllergens = (profile.allergens || []).map((a) =>
      a.toLowerCase().trim()
    );
    const userHealthConditions = (profile.health_conditions || []).map((hc) =>
      hc.toLowerCase().trim()
    );
    const userGoal = profile.goal?.toLowerCase().trim();
    const userEatingStyle = profile.eating_style?.toLowerCase().trim();

    const allergenMap = {
      meat: ["beef", "pork", "chicken", "turkey"],
      seafood: ["fish", "shellfish", "shrimp", "crab", "lobster", "squid"],
      dairy: ["milk", "cheese", "butter", "yogurt"],
    };

    // Expand allergens
    const expandedAllergens = new Set();
    for (const allergen of userAllergens) {
      expandedAllergens.add(allergen);
      if (allergenMap[allergen])
        allergenMap[allergen].forEach((a) => expandedAllergens.add(a));
    }
    userAllergens = Array.from(expandedAllergens);

    return dishes.filter((dish) => {
      // --- Dish allergens ---
      const ingredients =
        dish.ingredients_dish_id_fkey || dish.ingredients || [];
      const dishAllergens = Array.isArray(ingredients)
        ? ingredients.flatMap((ing) => {
            if (Array.isArray(ing.allergen_id)) {
              return ing.allergen_id.map((a) => a.name.toLowerCase().trim());
            }
            return ing.allergen_id?.name
              ? [ing.allergen_id.name.toLowerCase().trim()]
              : [];
          })
        : [];

      const dishIngredients = Array.isArray(ingredients)
        ? ingredients.map((i) => i.name?.toLowerCase().trim() || "")
        : [];

      // --- Dish health conditions ---
      let dishHealth = [];
      if (dish.health_condition) {
        if (Array.isArray(dish.health_condition)) {
          dishHealth = dish.health_condition.map((hc) =>
            hc.toLowerCase().trim()
          );
        } else if (typeof dish.health_condition === "string") {
          try {
            // Parse JSON array
            let cleaned = dish.health_condition
              .replace(/^\{/, "[")
              .replace(/\}$/, "]")
              .replace(/"/g, '"');
            const parsed = JSON.parse(cleaned);
            dishHealth = Array.isArray(parsed)
              ? parsed.map((hc) => hc.toLowerCase().trim())
              : [parsed.toLowerCase().trim()];
          } catch {
            dishHealth = [dish.health_condition.toLowerCase().trim()];
          }
        }
      }

      // --- Dish goals ---
      const dishGoals = Array.isArray(dish.goal)
        ? dish.goal.map((g) => g.toLowerCase().trim())
        : [];

      // --- Dish dietary / eating style ---
      const dishDietary = Array.isArray(dish.dietary)
        ? dish.dietary.map((d) => d.toLowerCase().trim())
        : [];

      const dishName = (dish.name || "").toLowerCase();
      const dishDescription = (dish.description || "").toLowerCase();

      // --- Filter by allergen ---
      const hasAllergen = userAllergens.some(
        (ua) =>
          dishAllergens.includes(ua) ||
          dishIngredients.includes(ua) ||
          dishIngredients.some((i) => i.includes(ua)) ||
          dishName.includes(ua) ||
          dishDescription.includes(ua)
      );
      if (hasAllergen) return false;

      // --- Filter by health conditions ---
      if (userHealthConditions.some((hc) => dishHealth.includes(hc)))
        return false;

      // --- Filter by goal ---
      if (userGoal && dishGoals.length && !dishGoals.includes(userGoal))
        return false;

      // --- Filter by eating style ---
      if (
        userEatingStyle &&
        dishDietary.length &&
        !dishDietary.includes(userEatingStyle)
      )
        return false;

      // --- Search query ---
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !dishName.includes(q) &&
          !dishIngredients.some((i) => i.includes(q))
        )
          return false;
      }

      return true;
    });
  };

  const handleAddMeal = async (meal) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAlertMessage("Please log in to add meals");
        setShowAlertModal(true);
        return;
      }

      // Validate required data
      if (!meal.id) {
        setAlertMessage("Invalid meal data. Please try again.");
        setShowAlertModal(true);
        return;
      }

      // Prepare meal log data using dish-level totals (from DB). Ingredients are not used for meal totals per user's request.
      // Get current date in local timezone
      const today = new Date();
      const localDate =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");

      // Check if there's rice in ingredients and get its amount
      const riceIngredient = (meal.ingredients_dish_id_fkey || []).find(
        (ing) => ing.is_rice
      );
      const hasRice = riceIngredient && riceIngredient.amount > 0;

      // Modify dish name if it has rice
      const dishName = hasRice
        ? `${meal.name || "Unknown Dish"} with rice`
        : meal.name || "Unknown Dish";

      const mealLogData = {
        user_id: user.id,
        dish_id: parseInt(meal.id),
        dish_name: dishName,
        meal_date: localDate,
        calories: Math.round(
          ((meal.total_calories || meal.base_total_calories || 0) * 100) / 100
        ),
        protein: Math.round(
          ((meal.total_protein || meal.base_total_protein || 0) * 100) / 100
        ),
        carbs: Math.round(
          ((meal.total_carbs || meal.base_total_carbs || 0) * 100) / 100
        ),
        fat: Math.round(
          ((meal.total_fats || meal.base_total_fats || 0) * 100) / 100
        ),
        meal_type: meal.planMealType || meal.type || "unknown",
        serving_label: `${meal.servingSize || meal.default_serving || 100} g`,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("meal_logs").insert([mealLogData]);

      if (error) {
        console.error("Error saving meal:", error);
        setAlertMessage(`Failed to save meal: ${error.message}`);
        setShowAlertModal(true);
      } else {
        // Update local mealLog state so the UI can reflect the change immediately
        setMealLog((prev) => [...(prev || []), mealLogData]);

        // Mark the corresponding meal(s) in the weekly plan as added so they become disabled
        setWeeklyPlan((prev) => {
          const updated = (prev || []).map((day) => ({
            ...day,
            meals: (day.meals || []).map((m) =>
              Number(m.id) === Number(meal.id) ? { ...m, added: true } : m
            ),
          }));
          try {
            if (user && user.id)
              localStorage.setItem(
                `weeklyPlan_${user.id}`,
                JSON.stringify(updated)
              );
          } catch {}
          return updated;
        });

        // Close the modal and show success message
        setSelectedDish(null);
        setAlertMessage("Meal added successfully!");
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error("Error adding meal:", error);
      setAlertMessage("An error occurred. Please try again.");
      setShowAlertModal(true);
    }
  };

  // -------------------- Smart Weekly Meal Plan --------------------
  const createSmartWeeklyMealPlan = (profile, dishes) => {
    if (!dishes?.length || !profile) return [];

    // Get the timeframe from profile, default to 7 days if not specified
    const timeframe = profile.timeframe || 7;
    const mealsPerDay = profile.meals_per_day || 3;
    const targetCalories = (profile.calorie_needs || 0) / mealsPerDay;
    const targetProtein = (profile.protein_needed || 0) / mealsPerDay;
    const targetCarbs = (profile.carbs_needed || 0) / mealsPerDay;
    const targetFats = (profile.fats_needed || 0) / mealsPerDay;

    const userAllergens = (profile.allergens || []).map((a) =>
      a.toLowerCase().trim()
    );
    const userHealthConditions = (profile.health_conditions || []).map((hc) =>
      hc.toLowerCase().trim()
    );
    const userGoal = profile.goal?.toLowerCase().trim();
    const userEatingStyle = profile.eating_style?.toLowerCase().trim();

    // Use the same filtering logic as getSuggestedDishes to build eligible dishes
    const eligibleDishes = getSuggestedDishes(profile, dishes);

    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

    const hasMealType = (dish, type) => {
      if (!dish.meal_type) return false;
      const types = dish.meal_type
        .split(/[,|/]/)
        .map((t) => t.toLowerCase().trim());
      return types.includes(type);
    };

    // Score a dish based on how well it matches the target macros
    const scoreDish = (dish) => {
      const nutrition = calculateDishNutrition(dish);
      const calorieScore =
        1 - Math.abs(nutrition.calories - targetCalories) / targetCalories;
      const proteinScore =
        1 - Math.abs(nutrition.protein - targetProtein) / targetProtein;
      const carbsScore =
        1 - Math.abs(nutrition.carbs - targetCarbs) / targetCarbs;
      const fatsScore = 1 - Math.abs(nutrition.fat - targetFats) / targetFats;

      // Weight the scores based on user's goals
      let weights = { calories: 1, protein: 1, carbs: 1, fats: 1 };

      if (userGoal?.includes("weight loss")) {
        weights = { calories: 1.5, protein: 1.2, carbs: 0.8, fats: 0.8 };
      } else if (userGoal?.includes("athletic")) {
        weights = { calories: 1, protein: 1.5, carbs: 1.2, fats: 0.8 };
      }

      return (
        (calorieScore * weights.calories +
          proteinScore * weights.protein +
          carbsScore * weights.carbs +
          fatsScore * weights.fats) /
        Object.values(weights).reduce((a, b) => a + b)
      );
    };

    // Create meal pools based on type and score
    const createMealPool = (type) => {
      return shuffle(
        eligibleDishes
          .filter((d) => hasMealType(d, type))
          .map((dish) => ({
            ...dish,
            score: scoreDish(dish),
          }))
          .sort((a, b) => b.score - a.score)
      );
    };

    let breakfastPool = createMealPool("breakfast");
    let lunchPool = createMealPool("lunch");
    let dinnerPool = createMealPool("dinner");
    let snackPool = createMealPool("snack");

    // Track used dish ids so we don't repeat the same dish across meal types/days
    const usedDishIds = new Set();

    const weeklyPlan = [];

    for (let i = 0; i < timeframe; i++) {
      const selectMeal = (pool) => {
        if (!pool || !pool.length)
          return { name: "Meal not found", ingredients: [] };
        // find the first dish in the pool that hasn't been used yet
        let idx = pool.findIndex((d) => !usedDishIds.has(d.id));
        if (idx === -1) {
          // all dishes in this pool were used; as a fallback, allow repeats by taking first
          idx = 0;
        }
        const meal = pool.splice(idx, 1)[0]; // remove from pool
        if (meal && meal.id) usedDishIds.add(meal.id);
        return meal || { name: "Meal not found", ingredients: [] };
      };

      const dayPlan = {
        day: `Day ${i + 1}`,
        meals: [],
      };

      // Add main meals
      const breakfast = selectMeal(breakfastPool);
      const lunch = selectMeal(lunchPool);
      const dinner = selectMeal(dinnerPool);

      dayPlan.meals.push({ type: "Breakfast", ...breakfast });
      dayPlan.meals.push({ type: "Lunch", ...lunch });
      dayPlan.meals.push({ type: "Dinner", ...dinner });

      // Add snacks if needed
      if (mealsPerDay > 3) {
        const snacks = Array(mealsPerDay - 3)
          .fill()
          .map(() => {
            const snack = selectMeal(snackPool);
            return { type: "Snack", ...snack };
          });
        dayPlan.meals.push(...snacks);
      }

      // Calculate daily totals
      const dailyTotals = dayPlan.meals.reduce(
        (totals, meal) => {
          const nutrition = calculateDishNutrition(meal);
          return {
            calories: totals.calories + nutrition.calories,
            protein: totals.protein + nutrition.protein,
            carbs: totals.carbs + nutrition.carbs,
            fat: totals.fat + nutrition.fat,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      dayPlan.totals = dailyTotals;
      weeklyPlan.push(dayPlan);
    }

    return weeklyPlan;
  };

  // Return true if a dish has been added for the specific meal type on this day
  const isDishAdded = (dishId, mealType) => {
    const idNum = Number(dishId);
    if (!idNum || !mealType) return false;

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const localDate =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");

    // Check if this specific dish + meal type combination exists in today's meal logs
    return (mealLog || []).some(
      (m) =>
        Number(m.dish_id) === idNum &&
        m.meal_type === mealType &&
        m.meal_date === localDate
    );
  };

  // Main rendering logic starts here

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          {Array(profile?.timeframe || 7)
            .fill()
            .map((_, i) => (
              <div key={i} className="mb-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 max-w-md mx-auto text-center">
        <p className="text-lg text-gray-600">
          Please complete your health profile to get personalized meal
          recommendations.
        </p>
        <button
          onClick={() => navigate("/healthprofile")}
          className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Create Health Profile
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <FaUtensils /> Your Personalized Meal Plan ({profile.timeframe || 7}{" "}
          Days)
        </h1>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-emerald-800 mb-2">
            Your Health Profile Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">
                Daily Calories:{" "}
                <span className="font-medium">
                  {Math.round(profile.calorie_needs)} kcal
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Eating Style:{" "}
                <span className="font-medium">{profile.eating_style}</span>
              </p>
              <p className="text-sm text-gray-600">
                Meals per Day:{" "}
                <span className="font-medium">
                  {profile.meals_per_day || 3}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Plan Duration:{" "}
                <span className="font-medium">
                  {profile.timeframe || 7} days
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Protein:{" "}
                <span className="font-medium">
                  {Math.round(profile.protein_needed)}g
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Carbs:{" "}
                <span className="font-medium">
                  {Math.round(profile.carbs_needed)}g
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Fats:{" "}
                <span className="font-medium">
                  {Math.round(profile.fats_needed)}g
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Two-column layout: Meal Types and Days */}
        <div className="grid grid-cols-[200px_1fr]">
          {/* Left column - Meal Types */}
          <div className="bg-gray-50 border-r">
            {["Breakfast", "Lunch", "Dinner", "Snack"].map(
              (mealType, index) => (
                <div
                  key={mealType}
                  className={`p-4 ${
                    index !== 3 ? "border-b" : ""
                  } hover:bg-emerald-50 transition-colors cursor-pointer`}
                >
                  <div className="font-semibold text-gray-700">{mealType}</div>
                </div>
              )
            )}
          </div>

          {/* Right column - Days and Dishes */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Days header */}
              <div
                className="grid gap-4 p-4 border-b bg-emerald-600"
                style={{
                  gridTemplateColumns: `repeat(${weeklyPlan.length}, 1fr)`,
                }}
              >
                {weeklyPlan.map((dayPlan, dayIndex) => {
                  const date = new Date();
                  date.setDate(date.getDate() + dayIndex);
                  const dayName = date.toLocaleDateString("en-US", {
                    weekday: "short",
                  });
                  const dayNum = date.getDate();
                  return (
                    <div key={dayIndex} className="text-white text-center">
                      <div className="font-semibold">{dayName}</div>
                      <div className="text-sm">Day {dayNum}</div>
                    </div>
                  );
                })}
              </div>

              {/* Meals Grid */}
              <div className="divide-y">
                {["Breakfast", "Lunch", "Dinner", "Snack"].map((mealType) => (
                  <div key={mealType} className="p-4">
                    <div
                      className="grid gap-4"
                      style={{
                        gridTemplateColumns: `repeat(${weeklyPlan.length}, 1fr)`,
                      }}
                    >
                      {weeklyPlan.map((dayPlan, dayIndex) => {
                        const meal = dayPlan.meals.find(
                          (m) => m.type === mealType
                        );
                        return (
                          <div key={dayIndex} className="relative">
                            {meal ? (
                              <div
                                onClick={() =>
                                  !meal.added && handleOpenDish(meal)
                                }
                                className={`
                                  cursor-pointer rounded-lg p-3 transition-colors
                                  ${
                                    meal.added
                                      ? "bg-gray-100 text-gray-400"
                                      : "bg-white hover:bg-emerald-50 text-emerald-700 shadow-sm"
                                  }
                                `}
                              >
                                <div className="aspect-video bg-gray-200 mb-2 rounded flex items-center justify-center text-gray-500 text-sm">
                                  No Image
                                </div>
                                <p className="text-sm font-medium truncate">
                                  {meal.name}
                                </p>
                                <div className="mt-2 text-xs text-gray-500 space-x-2">
                                  <span>
                                    {Math.round(meal.total_calories || 0)} kcal
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {Math.round(meal.total_protein || 0)}g
                                    protein
                                  </span>
                                </div>
                                {meal.added && (
                                  <span className="absolute top-2 right-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                    Added
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="h-[160px] flex items-center justify-center text-gray-400 text-sm bg-white rounded-lg border border-gray-100">
                                No meal planned
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Plan Totals */}
        <div className="border-t mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Plan Totals ({profile.timeframe || 7} Days)
          </h4>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600">Calories</div>
              <div className="text-lg font-semibold text-emerald-700">
                {Math.round(
                  weeklyPlan
                    .slice(0, 7)
                    .reduce((sum, day) => sum + (day.totals.calories || 0), 0)
                )}{" "}
                kcal
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Daily avg:{" "}
                {Math.round(
                  weeklyPlan.reduce(
                    (sum, day) => sum + (day.totals.calories || 0),
                    0
                  ) / (profile.timeframe || 7)
                )}{" "}
                kcal
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600">Protein</div>
              <div className="text-lg font-semibold text-emerald-700">
                {Math.round(
                  weeklyPlan.reduce(
                    (sum, day) => sum + (day.totals.protein || 0),
                    0
                  )
                )}
                g
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Daily avg:{" "}
                {Math.round(
                  weeklyPlan.reduce(
                    (sum, day) => sum + (day.totals.protein || 0),
                    0
                  ) / (profile.timeframe || 7)
                )}
                g
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600">Carbs</div>
              <div className="text-lg font-semibold text-emerald-700">
                {Math.round(
                  weeklyPlan.reduce(
                    (sum, day) => sum + (day.totals.carbs || 0),
                    0
                  )
                )}
                g
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Daily avg:{" "}
                {Math.round(
                  weeklyPlan.reduce(
                    (sum, day) => sum + (day.totals.carbs || 0),
                    0
                  ) / (profile.timeframe || 7)
                )}
                g
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600">Fats</div>
              <div className="text-lg font-semibold text-emerald-700">
                {Math.round(
                  weeklyPlan.reduce(
                    (sum, day) => sum + (day.totals.fat || 0),
                    0
                  )
                )}
                g
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Daily avg:{" "}
                {Math.round(
                  weeklyPlan.reduce(
                    (sum, day) => sum + (day.totals.fat || 0),
                    0
                  ) / (profile.timeframe || 7)
                )}
                g
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAlertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl text-center">
            <p>{alertMessage}</p>
            <button
              onClick={() => setShowAlertModal(false)}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Dish Detail Modal */}
      {selectedDish && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl overflow-auto max-h-[90vh] relative">
            <button
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-xl"
              onClick={() => setSelectedDish(null)}
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-4">{selectedDish.name}</h2>

            <div className="flex gap-6 mb-6">
              <div className="flex-1">
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Meal Type:</span>{" "}
                  {selectedDish.meal_type}
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Goal:</span> {selectedDish.goal}
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Dietary Style:</span>{" "}
                  {selectedDish.eating_style}
                </p>
              </div>
              <div className="flex-1">
                {selectedDish.description && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-gray-600">{selectedDish.description}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Ingredients & Nutrition
                </h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">
                      Serving size:
                    </span>
                    <input
                      type="number"
                      value={
                        selectedDish.servingSize ||
                        selectedDish.default_serving ||
                        100
                      }
                      min="1"
                      className="w-20 px-2 py-1 border rounded"
                      onChange={(e) =>
                        handleServingSizeChange(parseInt(e.target.value) || 100)
                      }
                    />
                    <span className="text-sm text-gray-600 ml-1">g</span>
                  </label>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-emerald-800 mb-2">
                  Dish Nutritional Values (calculated from ingredients)
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Calories</div>
                    <div className="text-lg font-semibold text-emerald-700">
                      {Math.round(
                        selectedDish.total_calories ||
                          selectedDish.base_total_calories ||
                          0
                      )}{" "}
                      kcal
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Protein</div>
                    <div className="text-lg font-semibold text-emerald-700">
                      {Math.round(
                        selectedDish.total_protein ||
                          selectedDish.base_total_protein ||
                          0
                      )}{" "}
                      g
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Carbohydrates</div>
                    <div className="text-lg font-semibold text-emerald-700">
                      {Math.round(
                        selectedDish.total_carbs ||
                          selectedDish.base_total_carbs ||
                          0
                      )}{" "}
                      g
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600">Fats</div>
                    <div className="text-lg font-semibold text-emerald-700">
                      {Math.round(
                        selectedDish.total_fats ||
                          selectedDish.base_total_fats ||
                          0
                      )}{" "}
                      g
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Note: totals are calculated from the dish ingredients (per
                  {selectedDish.amountBaseUnit || 100} g of dish). Ingredient
                  edits (e.g., rice overrides) will adjust the displayed totals.
                  Adjusting serving size scales the dish totals relative to the
                  detected baseline.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-3">Ingredient</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-right p-3">Calories</th>
                      <th className="text-right p-3">Protein</th>
                      <th className="text-right p-3">Carbs</th>
                      <th className="text-right p-3">Fats</th>
                      <th className="text-left p-3">Allergens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDish.ingredients_dish_id_fkey || []).map(
                      (ingredient) => (
                        <tr
                          key={ingredient.id}
                          className="border-t border-gray-200"
                        >
                          <td className="p-3">{ingredient.name}</td>
                          <td className="text-right p-3">
                            {ingredient.is_rice ? (
                              <>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="w-20 text-right px-1 py-0.5 border rounded"
                                  value={ingredient.amount}
                                  onChange={(e) =>
                                    handleIngredientAmountChange(
                                      ingredient.id,
                                      e.target.value
                                    )
                                  }
                                />{" "}
                                {ingredient.unit || "g"}
                              </>
                            ) : (
                              <span>
                                {ingredient.amount} {ingredient.unit || "g"}
                              </span>
                            )}
                          </td>
                          <td className="text-right p-3">
                            {Math.round(ingredient.calories || 0)}
                          </td>
                          <td className="text-right p-3">
                            {Math.round(ingredient.protein || 0)}g
                          </td>
                          <td className="text-right p-3">
                            {Math.round(ingredient.carbs || 0)}g
                          </td>
                          <td className="text-right p-3">
                            {Math.round(ingredient.fats || 0)}g
                          </td>
                          <td className="p-3 text-red-600">
                            {Array.isArray(ingredient.allergen_id)
                              ? ingredient.allergen_id
                                  .map((a) => a.name)
                                  .join(", ")
                              : ingredient.allergen_id?.name || ""}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedDish.steps?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Preparation Steps
                </h3>
                <ol className="list-decimal ml-6 space-y-2">
                  {selectedDish.steps.map((step, idx) => (
                    <li key={idx} className="text-gray-700">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() =>
                  !isDishAdded(selectedDish.id, selectedDish.planMealType) &&
                  handleAddMeal(selectedDish)
                }
                disabled={isDishAdded(
                  selectedDish.id,
                  selectedDish.planMealType
                )}
                className={
                  isDishAdded(selectedDish.id, selectedDish.planMealType)
                    ? "px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
                    : "px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                }
              >
                {isDishAdded(selectedDish.id, selectedDish.planMealType)
                  ? "Already Added"
                  : "Add to Meal Log"}
              </button>
              <button
                onClick={() => setSelectedDish(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <FooterNav />
    </div>
  );
}
