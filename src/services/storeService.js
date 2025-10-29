// Backed by Supabase where available; includes local fallback for safety.
import { supabase } from "../supabaseClient";

export const BOHOL_CITIES = [
  { id: "tagbilaran", name: "Tagbilaran City" },
  { id: "panglao", name: "Panglao" },
  { id: "dauis", name: "Dauis" },
  { id: "tubigon", name: "Tubigon" },
  { id: "talibon", name: "Talibon" },
  { id: "ubay", name: "Ubay" },
];

const STORE_CATALOG = {
  tagbilaran: [
    { id: "alturas-mall", name: "Alturas Mall Supermarket", type: "supermarket", address: "Gallares St, Tagbilaran", phone: "", delivery: true },
    { id: "icm-super", name: "Island City Mall Supermarket", type: "supermarket", address: "Dao District, Tagbilaran", phone: "", delivery: true },
    { id: "tagbilaran-public", name: "Tagbilaran Public Market", type: "public_market", address: "Cogon, Tagbilaran", phone: "", delivery: false },
  ],
  panglao: [
    { id: "alturas-panglao", name: "Alturas Panglao", type: "supermarket", address: "Panglao", phone: "", delivery: false },
    { id: "panglao-market", name: "Panglao Public Market", type: "public_market", address: "Poblacion, Panglao", phone: "", delivery: false },
  ],
  dauis: [
    { id: "dauis-market", name: "Dauis Public Market", type: "public_market", address: "Dauis", phone: "", delivery: false },
  ],
  tubigon: [
    { id: "tubigon-market", name: "Tubigon Public Market", type: "public_market", address: "Tubigon", phone: "", delivery: false },
  ],
  talibon: [
    { id: "talibon-market", name: "Talibon Public Market", type: "public_market", address: "Talibon", phone: "", delivery: false },
  ],
  ubay: [
    { id: "ubay-market", name: "Ubay Public Market", type: "public_market", address: "Ubay", phone: "", delivery: false },
  ],
};

export async function getBoholCities() {
  const { data, error } = await supabase
    .from("bohol_cities")
    .select("id,name")
    .order("name", { ascending: true });
  if (error || !data?.length) return BOHOL_CITIES;
  return data;
}

export async function getStoresByCity(cityId) {
  const { data, error } = await supabase
    .from("store_details")
    .select(
      `id, type, address, city_id,
       stores:stores!inner(id, name)`
    )
    .eq("city_id", cityId)
    .eq("active", true);

  if (error) return STORE_CATALOG[cityId] || [];
  return (data || []).map((row) => ({
    id: row.id,
    name: row.stores?.name || "Store",
    type: row.type,
    address: row.address,
    delivery: false,
  }));
}

// Very simple heuristic matcher for MVP
// - Greens/produce -> public markets prioritized
// - Packaged goods (oil, canned, milk) -> supermarkets prioritized
const PRODUCE_KEYWORDS = [
  "leaf", "leaves", "greens", "spinach", "kangkong", "tomato", "onion", "garlic", "ginger", "banana", "mango", "pepper", "chili", "eggplant", "okra", "cucumber", "lettuce", "carrot", "potato", "kamote", "squash", "ampalaya",
];
const PACKAGED_KEYWORDS = [
  "oil", "salt", "sugar", "soy", "sauce", "vinegar", "canned", "milk", "butter", "cheese", "bread", "noodle", "pasta", "rice", "oats", "flour",
];

function classifyIngredient(name = "") {
  const n = String(name).toLowerCase();
  if (PRODUCE_KEYWORDS.some((k) => n.includes(k))) return "produce";
  if (PACKAGED_KEYWORDS.some((k) => n.includes(k))) return "packaged";
  return "unknown";
}

export async function recommendStoresForIngredients(ingredients = [], cityId, options = {}) {
  const { onlyTypes = [] } = options;
  const stores = await getStoresByCity(cityId);
  const typeFiltered = onlyTypes.length ? stores.filter((s) => onlyTypes.includes(s.type)) : stores;

  const results = [];
  for (const ingRaw of ingredients) {
    const ingName = (typeof ingRaw === "string" ? ingRaw : ingRaw?.name || "").toLowerCase();
    // Query inventory for this ingredient in stores of the selected city
    const { data: inv, error } = await supabase
      .from("store_inventory")
      .select("store_id, ingredient_name, availability_status, price_min, price_max, unit")
      .ilike("ingredient_name", `%${ingName}%`);

    let matched = [];
    if (!error && inv?.length) {
      const cityStoreIds = new Set(typeFiltered.map((s) => s.id));
      matched = inv
        .filter((r) => cityStoreIds.has(r.store_id))
        .map((r) => {
          const s = typeFiltered.find((st) => st.id === r.store_id) || stores.find((st) => st.id === r.store_id);
          return s
            ? {
                id: s.id,
                name: s.name,
                type: s.type,
                address: s.address,
                availability: r.availability_status,
                price_min: r.price_min,
                price_max: r.price_max,
                unit: r.unit,
              }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => (a.availability === 'in_stock' ? -1 : 1));
    }

    if (!matched.length) {
      // Heuristic fallback by type if no inventory records
      const kind = classifyIngredient(ingName);
      let ranked = typeFiltered;
      if (kind === "produce") ranked = [...typeFiltered].sort((a, b) => (a.type === "public_market" ? -1 : 1));
      else if (kind === "packaged") ranked = [...typeFiltered].sort((a, b) => (a.type === "supermarket" ? -1 : 1));
      matched = ranked.slice(0, 2);
    }

    results.push({
      ingredient: typeof ingRaw === "string" ? { name: ingRaw } : ingRaw,
      stores: matched.slice(0, 2),
    });
  }

  return results;
}


