// Mealplan.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaUtensils } from "react-icons/fa";
import FooterNav from "../components/FooterNav";
import { getBoholCities, recommendStoresForIngredients } from "../services/storeService";

export default function Mealplan({ userId }) {
  const [profile, setProfile] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [mealLog, setMealLog] = useState([]);
  const [weeklyPlan, setWeeklyPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedCityId, setSelectedCityId] = useState("tagbilaran");
  const [storeTypeFilters, setStoreTypeFilters] = useState([]); // ["supermarket","public_market"]
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
          eating_style, health_condition, steps,image_url,
          ingredients_dish_id_fkey(id, name, amount, unit, calories, protein, fats, carbs, is_rice)
        `),
        supabase.from("meal_logs").select("*").eq("user_id", user.id),
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
      // --- 🧠 Check if we need to regenerate the plan based on timeframe ---
      const savedPlanRaw = localStorage.getItem(`weeklyPlan_${user.id}`);
      let plan = null;
      let needsNewPlan = true;

      if (savedPlanRaw) {
        try {
          plan = JSON.parse(savedPlanRaw);
          // handle both old array shape and new object shape { plan: [...] }
          const planLength = Array.isArray(plan)
            ? plan.length
            : plan?.plan?.length ?? 0;

          if (plan && planLength === (profileData.timeframe || 7)) {
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
        localStorage.setItem(`weeklyPlan_${user.id}`, JSON.stringify(updated));
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

  const [boholCities, setBoholCities] = useState([]);
  const [storeRecommendations, setStoreRecommendations] = useState([]);

  useEffect(() => {
    (async () => {
      const cities = await getBoholCities();
      setBoholCities(cities || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedDish) {
        setStoreRecommendations([]);
        return;
      }
      const ings = selectedDish.ingredients_dish_id_fkey || [];
      const recs = await recommendStoresForIngredients(ings, selectedCityId, {
        onlyTypes: storeTypeFilters,
      });
      setStoreRecommendations(recs || []);
    })();
  }, [selectedDish, selectedCityId, storeTypeFilters]);

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

      if (!meal.id) {
        setAlertMessage("Invalid meal data. Please try again.");
        setShowAlertModal(true);
        return;
      }

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

      // Save to Supabase
      const { error } = await supabase.from("meal_logs").insert([mealLogData]);

      if (error) {
        console.error("Error saving meal:", error);
        setAlertMessage(`Failed to save meal: ${error.message}`);
        setShowAlertModal(true);
        return;
      }

      // Update local state immediately
      setMealLog((prev) => [...(prev || []), mealLogData]);

      // ✅ Only disable the specific meal type for the specific day
      setWeeklyPlan((prev) => {
        if (!prev?.plan) return prev; // safety check

        const updatedPlan = prev.plan.map((day) => {
          if (day.date === localDate) {
            return {
              ...day,
              meals: (day.meals || []).map((m) =>
                m.type === (meal.planMealType || meal.type) &&
                Number(m.id) === Number(meal.id)
                  ? { ...m, added: true }
                  : m
              ),
            };
          }
          return day;
        });

        const updated = { ...prev, plan: updatedPlan };

        // ✅ Save to localStorage for persistence
        try {
          if (user?.id) {
            localStorage.setItem(
              `weeklyPlan_${user.id}`,
              JSON.stringify(updated)
            );
          }
        } catch (err) {
          console.error("Failed to save plan:", err);
        }

        return updated;
      });

      // Close modal and show success
      setSelectedDish(null);
      setAlertMessage("Meal added successfully!");
      setShowAlertModal(true);
    } catch (error) {
      console.error("Error adding meal:", error);
      setAlertMessage("An error occurred. Please try again.");
      setShowAlertModal(true);
    }
  };

  // -------------------- Smart Weekly Meal Plan --------------------
  // 🧠 Smart Weekly Meal Plan Generator — with Fixed Dates
  const createSmartWeeklyMealPlan = (profile, dishes) => {
    if (!dishes?.length || !profile) return [];

    // --- 1️⃣ Basic user setup ---
    const timeframe = Number(profile.timeframe) || 7;
    const mealsPerDay = Number(profile.meals_per_day) || 3;
    const targetCalories = (profile.calorie_needs || 0) / mealsPerDay;
    const targetProtein = (profile.protein_needed || 0) / mealsPerDay;
    const targetCarbs = (profile.carbs_needed || 0) / mealsPerDay;
    const targetFats = (profile.fats_needed || 0) / mealsPerDay;
    const userGoal = profile.goal?.toLowerCase().trim();

    // --- 2️⃣ FIXED start and end date (Day-based, not Month-based) ---
    // Use existing start date if present; otherwise, set once and reuse
    const startDate = profile.plan_start_date
      ? new Date(profile.plan_start_date)
      : new Date();

    // normalize startDate to midnight (avoid timezone drift)
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + timeframe - 1);
    endDate.setHours(0, 0, 0, 0);

    // store back (if needed)
    profile.plan_start_date = startDate.toISOString();
    profile.plan_end_date = endDate.toISOString();

    // --- 3️⃣ Filter eligible dishes ---
    const eligibleDishes = getSuggestedDishes(profile, dishes);

    const hasMealType = (dish, type) => {
      if (!dish.meal_type) return false;
      const types = dish.meal_type
        .split(/[,|/]/)
        .map((t) => t.toLowerCase().trim());
      return types.includes(type.toLowerCase());
    };

    // --- 4️⃣ Score dishes based on nutrition goals ---
    const scoreDish = (dish) => {
      const nutrition = calculateDishNutrition(dish);
      const calorieScore =
        1 - Math.abs(nutrition.calories - targetCalories) / targetCalories;
      const proteinScore =
        1 - Math.abs(nutrition.protein - targetProtein) / targetProtein;
      const carbsScore =
        1 - Math.abs(nutrition.carbs - targetCarbs) / targetCarbs;
      const fatsScore = 1 - Math.abs(nutrition.fat - targetFats) / targetFats;

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

    // --- 5️⃣ Create sorted meal pools ---
    const createMealPool = (type) =>
      eligibleDishes
        .filter((d) => hasMealType(d, type))
        .map((dish) => ({
          ...dish,
          score: scoreDish(dish),
        }))
        .sort((a, b) => b.score - a.score);

    const breakfastPool = createMealPool("breakfast");
    const lunchPool = createMealPool("lunch");
    const dinnerPool = createMealPool("dinner");
    const snackPool = createMealPool("snack");

    // --- 6️⃣ Build the plan ---
    const weeklyPlan = [];

    for (let i = 0; i < timeframe; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      currentDate.setHours(0, 0, 0, 0);

      const dayPlan = {
        day: `Day ${i + 1}`,
        date: currentDate.toISOString().split("T")[0],
        meals: [],
      };

      const usedToday = new Set();

      const selectMeal = (pool, index) => {
        if (!pool?.length) return { name: "Meal not found", ingredients: [] };
        const available = pool.filter((d) => !usedToday.has(d.id));
        const meal =
          available[index % available.length] || pool[index % pool.length];
        if (meal?.id) usedToday.add(meal.id);
        return meal;
      };

      const breakfast = selectMeal(breakfastPool, i);
      const lunch = selectMeal(lunchPool, i);
      const dinner = selectMeal(dinnerPool, i);

      dayPlan.meals.push({ type: "Breakfast", ...breakfast });
      dayPlan.meals.push({ type: "Lunch", ...lunch });
      dayPlan.meals.push({ type: "Dinner", ...dinner });

      if (mealsPerDay > 3) {
        const snacks = Array(mealsPerDay - 3)
          .fill()
          .map((_, j) => ({
            type: "Snack",
            ...selectMeal(snackPool, i + j),
          }));
        dayPlan.meals.push(...snacks);
      }

      // --- 7️⃣ Calculate totals per day ---
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

    // --- 8️⃣ Return final plan with proper formatted range ---
    return {
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      plan: weeklyPlan,
    };
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
    // <div className="p-4 max-w-6xl mx-auto">
    //   {/* Header */}
    //   <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
    //     <h1 className="text-2xl font-bold flex items-center gap-2 text-emerald-700">
    //       <FaUtensils />
    //       Your Personalized Meal Plan ({profile.timeframe || 7} Days)
    //     </h1>
    //     {weeklyPlan?.start_date && weeklyPlan?.end_date && (
    //       <p className="text-sm text-gray-500">
    //         {new Date(weeklyPlan.start_date).toLocaleDateString("en-US", {
    //           month: "short",
    //           day: "numeric",
    //         })}{" "}
    //         –{" "}
    //         {new Date(weeklyPlan.end_date).toLocaleDateString("en-US", {
    //           month: "short",
    //           day: "numeric",
    //         })}
    //       </p>
    //     )}
    //   </div>

    //   {/* Plan Grid */}
    //   <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
    //     <div
    //       className="grid min-w-max"
    //       style={{
    //         gridTemplateColumns: `160px repeat(${
    //           weeklyPlan?.plan?.length || 0
    //         }, 1fr)`,
    //       }}
    //     >
    //       {/* Empty corner cell */}
    //       <div className="bg-emerald-600 rounded-tl-2xl"></div>

    //       {/* 🗓️ Day Headers */}
    //       {weeklyPlan?.plan?.map((dayPlan, i) => {
    //         const date = new Date(dayPlan.date);
    //         const dayName = date.toLocaleDateString("en-US", {
    //           weekday: "short",
    //         });
    //         return (
    //           <div
    //             key={i}
    //             className="bg-emerald-600 text-white text-center py-3 font-semibold border-l border-emerald-500"
    //           >
    //             <div>{dayName}</div>
    //             <div className="text-xs text-emerald-100">
    //               {date.toLocaleDateString("en-US", {
    //                 month: "short",
    //                 day: "numeric",
    //               })}
    //             </div>
    //           </div>
    //         );
    //       })}

    //       {/* 🍽️ Meal Rows */}
    //       {["Breakfast", "Lunch", "Dinner", "Snack"].map((mealType) => (
    //         <React.Fragment key={mealType}>
    //           {/* Left-side meal type label */}
    //           <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 font-semibold text-gray-700 text-sm sticky left-0 z-10">
    //             {mealType}
    //           </div>

    //           {/* Meal cells per day */}
    //           {weeklyPlan?.plan?.map((dayPlan, j) => {
    //             const meal = dayPlan.meals.find((m) => m.type === mealType);
    //             return (
    //               <div
    //                 key={j}
    //                 className="border-t border-l border-gray-100 p-3 flex flex-col items-center justify-center min-h-[170px] transition-all duration-300 hover:bg-emerald-50"
    //               >
    //                 {meal ? (
    //                   <div
    //                     onClick={() => !meal.added && handleOpenDish(meal)}
    //                     className={`relative w-full max-w-[130px] p-2 text-center rounded-xl shadow-sm border transition-all duration-200 ${
    //                       meal.added
    //                         ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
    //                         : "bg-white hover:shadow-md hover:border-emerald-300 text-gray-700 cursor-pointer"
    //                     }`}
    //                   >
    //                     <div className="w-24 h-24 mx-auto mb-2 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
    //                       {meal.image_url ? (
    //                         <img
    //                           src={meal.image_url}
    //                           alt={meal.name || "Dish"}
    //                           className="w-full h-full object-cover"
    //                         />
    //                       ) : (
    //                         <span>No Image</span>
    //                       )}
    //                     </div>

    //                     <p className="text-sm font-medium truncate">
    //                       {meal.name}
    //                     </p>
    //                     <p className="text-xs text-gray-500 mt-1">
    //                       {Math.round(meal.total_calories || 0)} kcal •{" "}
    //                       {Math.round(meal.total_protein || 0)}g
    //                     </p>

    //                     {/* Smooth badge animation for added state */}
    //                     {meal.added && (
    //                       <span className="absolute top-2 right-2 text-[10px] bg-green-100 text-green-700 px-2 py-[2px] rounded-full animate-fadeIn">
    //                         ✓ Added
    //                       </span>
    //                     )}
    //                   </div>
    //                 ) : (
    //                   <div className="text-gray-400 text-xs flex items-center justify-center h-full w-full bg-white rounded-xl border border-dashed border-gray-200">
    //                     No meal
    //                   </div>
    //                 )}
    //               </div>
    //             );
    //           })}
    //         </React.Fragment>
    //       ))}
    //     </div>
    //   </div>

    //   {/* Alert Modal */}
    //   {showAlertModal && (
    //     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    //       <div className="bg-white p-6 rounded-xl text-center">
    //         <p>{alertMessage}</p>
    //         <button
    //           onClick={() => setShowAlertModal(false)}
    //           className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
    //         >
    //           OK
    //         </button>
    //       </div>
    //     </div>
    //   )}

    //   {/* Dish Detail Modal */}
    //   {selectedDish && (
    //     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    //       <div className="bg-white rounded-xl p-6 w-full max-w-3xl overflow-auto max-h-[90vh] relative">
    //         <button
    //           className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-xl"
    //           onClick={() => setSelectedDish(null)}
    //         >
    //           ✕
    //         </button>

    //         <h2 className="text-2xl font-bold mb-4">{selectedDish.name}</h2>

    //         <div className="flex gap-6 mb-6">
    //           <div className="flex-1">
    //             <p className="text-gray-600 mb-2">
    //               <span className="font-medium">Meal Type:</span>{" "}
    //               {selectedDish.meal_type}
    //             </p>
    //             <p className="text-gray-600 mb-2">
    //               <span className="font-medium">Goal:</span> {selectedDish.goal}
    //             </p>
    //             <p className="text-gray-600 mb-2">
    //               <span className="font-medium">Dietary Style:</span>{" "}
    //               {selectedDish.eating_style}
    //             </p>
    //           </div>
    //           <div className="flex-1">
    //             {selectedDish.description && (
    //               <div>
    //                 <h3 className="text-lg font-semibold mb-2">Description</h3>
    //                 <p className="text-gray-600">{selectedDish.description}</p>
    //               </div>
    //             )}
    //           </div>
    //         </div>

    //         <div className="mb-6">
    //           <div className="flex items-center justify-between mb-4">
    //             <h3 className="text-lg font-semibold">
    //               Ingredients & Nutrition
    //             </h3>
    //             <div className="flex items-center space-x-4">
    //               <label className="flex items-center">
    //                 <span className="text-sm text-gray-600 mr-2">
    //                   Serving size:
    //                 </span>
    //                 <input
    //                   type="number"
    //                   value={
    //                     selectedDish.servingSize ||
    //                     selectedDish.default_serving ||
    //                     100
    //                   }
    //                   min="1"
    //                   className="w-20 px-2 py-1 border rounded"
    //                   onChange={(e) =>
    //                     handleServingSizeChange(parseInt(e.target.value) || 100)
    //                   }
    //                 />
    //                 <span className="text-sm text-gray-600 ml-1">g</span>
    //               </label>
    //             </div>
    //           </div>

    //           <div className="bg-emerald-50 rounded-lg p-4 mb-4">
    //             <h4 className="text-sm font-medium text-emerald-800 mb-2">
    //               Dish Nutritional Values (calculated from ingredients)
    //             </h4>
    //             <div className="grid grid-cols-4 gap-4">
    //               <div className="bg-white p-3 rounded-lg shadow-sm">
    //                 <div className="text-sm text-gray-600">Calories</div>
    //                 <div className="text-lg font-semibold text-emerald-700">
    //                   {Math.round(
    //                     selectedDish.total_calories ||
    //                       selectedDish.base_total_calories ||
    //                       0
    //                   )}{" "}
    //                   kcal
    //                 </div>
    //               </div>
    //               <div className="bg-white p-3 rounded-lg shadow-sm">
    //                 <div className="text-sm text-gray-600">Protein</div>
    //                 <div className="text-lg font-semibold text-emerald-700">
    //                   {Math.round(
    //                     selectedDish.total_protein ||
    //                       selectedDish.base_total_protein ||
    //                       0
    //                   )}{" "}
    //                   g
    //                 </div>
    //               </div>
    //               <div className="bg-white p-3 rounded-lg shadow-sm">
    //                 <div className="text-sm text-gray-600">Carbohydrates</div>
    //                 <div className="text-lg font-semibold text-emerald-700">
    //                   {Math.round(
    //                     selectedDish.total_carbs ||
    //                       selectedDish.base_total_carbs ||
    //                       0
    //                   )}{" "}
    //                   g
    //                 </div>
    //               </div>
    //               <div className="bg-white p-3 rounded-lg shadow-sm">
    //                 <div className="text-sm text-gray-600">Fats</div>
    //                 <div className="text-lg font-semibold text-emerald-700">
    //                   {Math.round(
    //                     selectedDish.total_fats ||
    //                       selectedDish.base_total_fats ||
    //                       0
    //                   )}{" "}
    //                   g
    //                 </div>
    //               </div>
    //             </div>
    //             <p className="text-xs text-gray-600 mt-2">
    //               Note: totals are calculated from the dish ingredients (per
    //               {selectedDish.amountBaseUnit || 100} g of dish). Ingredient
    //               edits (e.g., rice overrides) will adjust the displayed totals.
    //               Adjusting serving size scales the dish totals relative to the
    //               detected baseline.
    //             </p>
    //           </div>

    //           <div className="bg-gray-50 rounded-lg overflow-hidden">
    //             <table className="w-full border-collapse">
    //               <thead>
    //                 <tr className="bg-gray-100">
    //                   <th className="text-left p-3">Ingredient</th>
    //                   <th className="text-right p-3">Amount</th>
    //                   <th className="text-right p-3">Calories</th>
    //                   <th className="text-right p-3">Protein</th>
    //                   <th className="text-right p-3">Carbs</th>
    //                   <th className="text-right p-3">Fats</th>
    //                   <th className="text-left p-3">Allergens</th>
    //                 </tr>
    //               </thead>
    //               <tbody>
    //                 {(selectedDish.ingredients_dish_id_fkey || []).map(
    //                   (ingredient) => (
    //                     <tr
    //                       key={ingredient.id}
    //                       className="border-t border-gray-200"
    //                     >
    //                       <td className="p-3">{ingredient.name}</td>
    //                       <td className="text-right p-3">
    //                         {ingredient.is_rice ? (
    //                           <>
    //                             <input
    //                               type="number"
    //                               step="0.1"
    //                               className="w-20 text-right px-1 py-0.5 border rounded"
    //                               value={ingredient.amount}
    //                               onChange={(e) =>
    //                                 handleIngredientAmountChange(
    //                                   ingredient.id,
    //                                   e.target.value
    //                                 )
    //                               }
    //                             />{" "}
    //                             {ingredient.unit || "g"}
    //                           </>
    //                         ) : (
    //                           <span>
    //                             {ingredient.amount} {ingredient.unit || "g"}
    //                           </span>
    //                         )}
    //                       </td>
    //                       <td className="text-right p-3">
    //                         {Math.round(ingredient.calories || 0)}
    //                       </td>
    //                       <td className="text-right p-3">
    //                         {Math.round(ingredient.protein || 0)}g
    //                       </td>
    //                       <td className="text-right p-3">
    //                         {Math.round(ingredient.carbs || 0)}g
    //                       </td>
    //                       <td className="text-right p-3">
    //                         {Math.round(ingredient.fats || 0)}g
    //                       </td>
    //                       <td className="p-3 text-red-600">
    //                         {Array.isArray(ingredient.allergen_id)
    //                           ? ingredient.allergen_id
    //                               .map((a) => a.name)
    //                               .join(", ")
    //                           : ingredient.allergen_id?.name || ""}
    //                       </td>
    //                     </tr>
    //                   )
    //                 )}
    //               </tbody>
    //             </table>
    //           </div>
    //         </div>

    //         {selectedDish.steps?.length > 0 && (
    //           <div className="mb-6">
    //             <h3 className="text-lg font-semibold mb-3">
    //               Preparation Steps
    //             </h3>
    //             <ol className="list-decimal ml-6 space-y-2">
    //               {selectedDish.steps.map((step, idx) => (
    //                 <li key={idx} className="text-gray-700">
    //                   {step}
    //                 </li>
    //               ))}
    //             </ol>
    //           </div>
    //         )}

    //         <div className="mt-6 flex justify-end gap-3">
    //           <button
    //             onClick={() =>
    //               !isDishAdded(selectedDish.id, selectedDish.planMealType) &&
    //               handleAddMeal(selectedDish)
    //             }
    //             disabled={isDishAdded(
    //               selectedDish.id,
    //               selectedDish.planMealType
    //             )}
    //             className={
    //               isDishAdded(selectedDish.id, selectedDish.planMealType)
    //                 ? "px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
    //                 : "px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
    //             }
    //           >
    //             {isDishAdded(selectedDish.id, selectedDish.planMealType)
    //               ? "Already Added"
    //               : "Add to Meal Log"}
    //           </button>
    //           <button
    //             onClick={() => setSelectedDish(null)}
    //             className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
    //           >
    //             Close
    //           </button>
    //         </div>
    //       </div>
    //     </div>
    //   )}
    //   <FooterNav />
    // </div>


  
  <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-6">
    {/* Main container */}
    <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-green-500 to-green-400 rounded-t-2xl px-5 pt-6 pb-4 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          {/* Left side: Title */}
          <h1 className="text-2xl font-extrabold text-white tracking-wide">
            Your Personalized Meal Plan
          </h1>
          <div className="mt-1 sm:mt-0 text-green-100 text-sm sm:text-base font-medium sm:text-right">
            {weeklyPlan?.start_date && weeklyPlan?.end_date && (
              <p>
                {new Date(weeklyPlan.start_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                –{" "}
                {new Date(weeklyPlan.end_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
            <p className="text-xs sm:text-sm text-green-200">
              ({profile.timeframe || 7} Days)
            </p>
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-green-200 scrollbar-track-green-50 p-4 pb-24">
        {/* GRID CONTAINER */}
        <div className="bg-white rounded-2xl shadow-inner border border-green-100 overflow-auto">
          <div
            className="grid text-sm md:text-base"
            style={{
              gridTemplateColumns: `140px repeat(${weeklyPlan?.plan?.length || 0}, 160px)`,
              minWidth: weeklyPlan?.plan?.length
                ? `${140 + 160 * weeklyPlan.plan.length}px`
                : "100%",
            }}
          >
            {/* Empty Corner */}
            <div className="bg-green-600 rounded-tl-2xl h-[72px] border-r border-green-500" />

            {/* Day Headers */}
            {weeklyPlan?.plan?.map((dayPlan, i) => {
              const date = new Date(dayPlan.date);
              const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
              return (
                <div
                  key={i}
                  className="bg-green-600 text-white text-center py-3 font-semibold border-l border-green-500 sticky top-0 z-20"
                >
                  <div>{dayName}</div>
                  <div className="text-xs text-green-100">
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              );
            })}

            {/* Meal Rows */}
            {["Breakfast", "Lunch", "Dinner", "Snack"].map((mealType) => (
              <React.Fragment key={mealType}>
                {/* Sticky Left Labels */}
                <div className="bg-green-50 border-t border-green-100 px-3 py-2 font-semibold text-green-700 text-sm sticky left-0 z-30">
                  {mealType}
                </div>

                {/* Meal Cells */}
                {weeklyPlan?.plan?.map((dayPlan, j) => {
                  const meal = dayPlan.meals.find((m) => m.type === mealType);
                  return (
                    <div
                      key={j}
                      className="border-t border-l border-green-100 p-3 flex items-start justify-center min-h-[140px] transition-all duration-300 hover:bg-green-50"
                    >
                      {meal ? (
                        <div
                          onClick={() => !meal.added && handleOpenDish(meal)}
                          className={`relative w-full max-w-[140px] p-2 text-center rounded-xl border transition-all duration-200 flex flex-col items-center ${
                            meal.added
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-white hover:shadow-md hover:border-green-300 text-gray-700 cursor-pointer"
                          }`}
                        >
                          <div className="w-24 h-24 sm:w-28 sm:h-28 mb-2 rounded-lg overflow-hidden flex items-center justify-center bg-green-50 text-gray-400 text-xs">
                            {meal.image_url ? (
                              <img
                                src={meal.image_url}
                                alt={meal.name || "Dish"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs">No Image</span>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate text-green-700 w-full">{meal.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.round(meal.total_calories || 0)} kcal • {Math.round(meal.total_protein || 0)}g
                          </p>
                          {meal.added && (
                            <span className="absolute top-2 right-2 text-[10px] bg-green-100 text-green-700 px-2 py-[2px] rounded-full">
                              ✓ Added
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs flex items-center justify-center h-full w-full bg-white rounded-xl border border-dashed border-green-200">
                          No meal
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ALERT MODAL */}
        {showAlertModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl text-center shadow-xl border border-green-100 max-w-sm w-full">
              <p className="text-gray-700 font-medium">{alertMessage}</p>
              <button
                onClick={() => setShowAlertModal(false)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* SELECTED DISH MODAL */}
        {selectedDish && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-3xl overflow-auto max-h-[90vh] relative shadow-2xl border border-green-100">
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

            {/* Where to buy in Bohol */}
            <div className="mb-6 bg-white rounded-xl border border-green-100 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <h3 className="text-lg font-semibold text-green-700">Where to buy (Bohol)</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm text-gray-700">
                    City/Municipality
                    <select
                      className="ml-2 border rounded px-2 py-1 text-sm"
                      value={selectedCityId}
                      onChange={(e) => setSelectedCityId(e.target.value)}
                    >
                      {boholCities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { id: "supermarket", label: "Supermarket" },
                      { id: "public_market", label: "Public Market" },
                    ].map((t) => {
                      const active = storeTypeFilters.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() =>
                            setStoreTypeFilters((prev) =>
                              active ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                            )
                          }
                          className={`px-3 py-1 rounded-full text-sm border ${
                            active ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-green-200"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {storeRecommendations.map((rec) => (
                  <div key={rec.ingredient.id || rec.ingredient.name} className="border rounded-lg p-3 border-green-100">
                    <div className="text-sm font-medium text-gray-800 mb-2">{rec.ingredient.name}</div>
                    {rec.stores.length ? (
                      <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                        {rec.stores.map((s) => (
                          <li key={s.id}>
                            <span className="font-medium">{s.name}</span>
                            <span className="ml-2 text-xs text-gray-500">{s.type === "public_market" ? "Public Market" : "Supermarket"}</span>
                            {s.address ? <span className="ml-2 text-xs text-gray-500">{s.address}</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-500">No suggestions for this city. Try removing filters.</div>
                    )}
                  </div>
                ))}
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
      </div>

      {/* FIXED FOOTER */}
      <div className="border-t border-green-100 bg-white p-2 shadow-inner z-40">
        <FooterNav />
      </div>
    </div>
  </div>
);


}






// return (
//   <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-6">
//     <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
      
//       {/* Scrollable Section */}
//       <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-green-200 scrollbar-track-green-50 p-4">
        
//         {/* Header */}
//         <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-gradient-to-r from-green-600 to-green-400 text-white rounded-xl p-4 shadow-md">
//           <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
//             <FaUtensils className="text-white text-xl md:text-2xl" />
//             <span>
//               Your Personalized Meal Plan
//               <span className="block text-sm font-normal text-green-100">
//                 ({profile.timeframe || 7} Days)
//               </span>
//             </span>
//           </h1>
//           {weeklyPlan?.start_date && weeklyPlan?.end_date && (
//             <p className="text-xs sm:text-sm text-green-100 mt-2 sm:mt-0">
//               {new Date(weeklyPlan.start_date).toLocaleDateString("en-US", {
//                 month: "short",
//                 day: "numeric",
//               })}{" "}
//               –{" "}
//               {new Date(weeklyPlan.end_date).toLocaleDateString("en-US", {
//                 month: "short",
//                 day: "numeric",
//               })}
//             </p>
//           )}
//         </div>

//         {/* Plan Grid */}
//         <div className="bg-white rounded-2xl shadow-inner border border-green-100 overflow-x-auto">
//           <div
//             className="grid min-w-max text-sm md:text-base"
//             style={{
//               gridTemplateColumns: `140px repeat(${weeklyPlan?.plan?.length || 0}, 1fr)`,
//             }}
//           >
//             {/* Empty Corner */}
//             <div className="bg-green-600 rounded-tl-2xl"></div>

//             {/* 🗓️ Day Headers */}
//             {weeklyPlan?.plan?.map((dayPlan, i) => {
//               const date = new Date(dayPlan.date);
//               const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
//               return (
//                 <div
//                   key={i}
//                   className="bg-green-600 text-white text-center py-3 font-semibold border-l border-green-500"
//                 >
//                   <div>{dayName}</div>
//                   <div className="text-xs text-green-100">
//                     {date.toLocaleDateString("en-US", {
//                       month: "short",
//                       day: "numeric",
//                     })}
//                   </div>
//                 </div>
//               );
//             })}

//             {/* 🍽️ Meal Rows */}
//             {["Breakfast", "Lunch", "Dinner", "Snack"].map((mealType) => (
//               <React.Fragment key={mealType}>
//                 <div className="bg-green-50 border-t border-green-100 px-3 py-2 font-semibold text-green-700 text-sm sticky left-0 z-10">
//                   {mealType}
//                 </div>

//                 {weeklyPlan?.plan?.map((dayPlan, j) => {
//                   const meal = dayPlan.meals.find((m) => m.type === mealType);
//                   return (
//                     <div
//                       key={j}
//                       className="border-t border-l border-green-100 p-2 flex flex-col items-center justify-center min-h-[140px] md:min-h-[160px] lg:min-h-[180px] transition-all duration-300 hover:bg-green-50"
//                     >
//                       {meal ? (
//                         <div
//                           onClick={() => !meal.added && handleOpenDish(meal)}
//                           className={`relative w-full max-w-[120px] sm:max-w-[150px] p-2 text-center rounded-xl border transition-all duration-200 ${
//                             meal.added
//                               ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
//                               : "bg-white hover:shadow-md hover:border-green-300 text-gray-700 cursor-pointer"
//                           }`}
//                         >
//                           <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-2 rounded-lg overflow-hidden flex items-center justify-center bg-green-50 text-gray-400 text-xs">
//                             {meal.image_url ? (
//                               <img
//                                 src={meal.image_url}
//                                 alt={meal.name || "Dish"}
//                                 className="w-full h-full object-cover"
//                               />
//                             ) : (
//                               <span>No Image</span>
//                             )}
//                           </div>
//                           <p className="text-sm font-medium truncate text-green-700">{meal.name}</p>
//                           <p className="text-xs text-gray-500 mt-1">
//                             {Math.round(meal.total_calories || 0)} kcal •{" "}
//                             {Math.round(meal.total_protein || 0)}g
//                           </p>
//                           {meal.added && (
//                             <span className="absolute top-2 right-2 text-[10px] bg-green-100 text-green-700 px-2 py-[2px] rounded-full animate-fadeIn">
//                               ✓ Added
//                             </span>
//                           )}
//                         </div>
//                       ) : (
//                         <div className="text-gray-400 text-xs flex items-center justify-center h-full w-full bg-white rounded-xl border border-dashed border-green-200">
//                           No meal
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//               </React.Fragment>
//             ))}
//           </div>
//         </div>

//         {/* ⚠️ Alert Modal */}
//         {showAlertModal && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//             <div className="bg-white p-6 rounded-xl text-center shadow-xl border border-green-100 max-w-sm w-full">
//               <p className="text-gray-700 font-medium">{alertMessage}</p>
//               <button
//                 onClick={() => setShowAlertModal(false)}
//                 className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
//               >
//                 OK
//               </button>
//             </div>
//           </div>
//         )}

//         {/* 🍲 Dish Modal */}
//         {selectedDish && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//             <div className="bg-white rounded-2xl p-6 w-full max-w-3xl overflow-auto max-h-[90vh] relative shadow-2xl border border-green-100">
//               <button
//                 className="absolute top-4 right-4 text-gray-600 hover:text-green-600 text-xl"
//                 onClick={() => setSelectedDish(null)}
//               >
//                 ✕
//               </button>

//               <h2 className="text-2xl font-bold mb-4 text-green-700">{selectedDish.name}</h2>

//               <div className="flex flex-col md:flex-row gap-6 mb-6">
//                 <div className="flex-1 bg-green-50 p-4 rounded-xl border border-green-100">
//                   <p className="text-gray-600 mb-2">
//                     <span className="font-semibold text-green-700">Meal Type:</span>{" "}
//                     {selectedDish.meal_type}
//                   </p>
//                   <p className="text-gray-600 mb-2">
//                     <span className="font-semibold text-green-700">Goal:</span>{" "}
//                     {selectedDish.goal}
//                   </p>
//                   <p className="text-gray-600 mb-2">
//                     <span className="font-semibold text-green-700">Dietary Style:</span>{" "}
//                     {selectedDish.eating_style}
//                   </p>
//                 </div>

//                 {selectedDish.description && (
//                   <div className="flex-1 bg-white p-4 rounded-xl border border-green-100">
//                     <h3 className="text-lg font-semibold text-green-700 mb-2">Description</h3>
//                     <p className="text-gray-600">{selectedDish.description}</p>
//                   </div>
//                 )}
//               </div>

//               {/* Nutrition Section */}
//               <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-6">
//                 <div className="flex flex-wrap justify-between items-center mb-3 gap-3">
//                   <h3 className="text-lg font-semibold text-green-700">
//                     Ingredients & Nutrition
//                   </h3>
//                   <label className="flex items-center space-x-2 text-sm">
//                     <span className="text-gray-600">Serving size:</span>
//                     <input
//                       type="number"
//                       value={
//                         selectedDish.servingSize ||
//                         selectedDish.default_serving ||
//                         100
//                       }
//                       min="1"
//                       className="w-20 px-2 py-1 border rounded text-gray-700"
//                       onChange={(e) =>
//                         handleServingSizeChange(parseInt(e.target.value) || 100)
//                       }
//                     />
//                     <span className="text-gray-600">g</span>
//                   </label>
//                 </div>

//                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//                   {[
//                     ["Calories", selectedDish.total_calories || 0, "kcal"],
//                     ["Protein", selectedDish.total_protein || 0, "g"],
//                     ["Carbs", selectedDish.total_carbs || 0, "g"],
//                     ["Fats", selectedDish.total_fats || 0, "g"],
//                   ].map(([label, value, unit], idx) => (
//                     <div
//                       key={idx}
//                       className="bg-white rounded-lg shadow-sm p-3 border border-green-100 text-center"
//                     >
//                       <div className="text-sm text-gray-600">{label}</div>
//                       <div className="text-lg font-semibold text-green-700">
//                         {Math.round(value)} {unit}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {selectedDish.steps?.length > 0 && (
//                 <div className="mb-6 bg-white p-4 rounded-xl border border-green-100">
//                   <h3 className="text-lg font-semibold mb-3 text-green-700">
//                     Preparation Steps
//                   </h3>
//                   <ol className="list-decimal ml-6 space-y-2 text-gray-700">
//                     {selectedDish.steps.map((step, idx) => (
//                       <li key={idx}>{step}</li>
//                     ))}
//                   </ol>
//                 </div>
//               )}

//               <div className="mt-6 flex flex-wrap justify-end gap-3">
//                 <button
//                   onClick={() =>
//                     !isDishAdded(selectedDish.id, selectedDish.planMealType) &&
//                     handleAddMeal(selectedDish)
//                   }
//                   disabled={isDishAdded(selectedDish.id, selectedDish.planMealType)}
//                   className={`px-4 py-2 rounded-lg transition-colors ${
//                     isDishAdded(selectedDish.id, selectedDish.planMealType)
//                       ? "bg-gray-300 text-gray-600 cursor-not-allowed"
//                       : "bg-green-600 text-white hover:bg-green-700"
//                   }`}
//                 >
//                   {isDishAdded(selectedDish.id, selectedDish.planMealType)
//                     ? "Already Added"
//                     : "Add to Meal Log"}
//                 </button>
//                 <button
//                   onClick={() => setSelectedDish(null)}
//                   className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Footer (Fixed inside white container) */}
//       <div className="border-t border-green-100 bg-white p-2">
//         <FooterNav />
//       </div>
//     </div>
//   </div>
// );

