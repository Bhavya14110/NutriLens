import type { Loc } from "@/types/db";

export type CanonGroup =
  | "dairy"
  | "grain"
  | "pulse"
  | "veg"
  | "fruit"
  | "spice"
  | "sauce"
  | "bev"
  | "protein"
  | "nut"
  | "sweet"
  | "oil"
  | "snack"
  | "bakery";

export type Canon = {
  id: string; // stable key, stored in pantry_items.canon_ing
  label: string;
  group: CanonGroup;
  kw: string[]; // lowercase keywords matched on whole words in product names
  tags: string[]; // Open Food Facts category tags
  shelf: number; // default shelf life in days once bought/opened
  loc: Loc;
  spoon?: string; // name spoonacular understands, defaults to id
  meal?: string; // TheMealDB ingredient name, defaults to Title Case of spoon/id
  cdb?: string; // TheCocktailDB ingredient name, only for drinkable leftovers
  fv?: string; // Fruityvice fruit name
};

type Extra = Partial<Pick<Canon, "spoon" | "meal" | "cdb" | "fv">>;

const c = (id: string, label: string, group: CanonGroup, kw: string[], tags: string[], shelf: number, loc: Loc, x: Extra = {}): Canon => ({
  id,
  label,
  group,
  kw,
  tags,
  shelf,
  loc,
  ...x,
});

// ~150 base ingredients. Order matters only for ties; longer keyword wins first.
export const CANON: Canon[] = [
  // dairy
  c("milk", "Milk", "dairy", ["milk", "toned milk", "full cream milk", "doodh", "taaza", "skimmed milk", "whole milk", "cow milk"], ["en:milks", "en:cow-milks", "en:whole-milks", "en:semi-skimmed-milks", "en:skimmed-milks", "en:uht-milks", "en:pasteurised-milks"], 5, "fridge", { cdb: "Milk" }),
  c("curd", "Curd (dahi)", "dairy", ["curd", "dahi", "yogurt", "yoghurt", "greek yogurt"], ["en:yogurts", "en:plain-yogurts", "en:greek-style-yogurts", "en:natural-yogurts"], 4, "fridge", { spoon: "yogurt", meal: "Greek Yogurt", cdb: "Yoghurt" }),
  c("paneer", "Paneer", "dairy", ["paneer", "cottage cheese"], ["en:paneer", "en:cottage-cheeses"], 5, "fridge", { meal: "Paneer" }),
  c("cheese", "Cheese", "dairy", ["cheese", "cheddar", "mozzarella", "processed cheese", "cheese slices"], ["en:cheeses", "en:cheddar", "en:mozzarella", "en:processed-cheeses"], 21, "fridge", { meal: "Cheese" }),
  c("butter", "Butter", "dairy", ["butter", "salted butter", "makhan"], ["en:butters", "en:salted-butters", "en:unsalted-butters"], 60, "fridge"),
  c("ghee", "Ghee", "dairy", ["ghee", "clarified butter"], ["en:ghee", "en:clarified-butters"], 180, "shelf"),
  c("cream", "Fresh cream", "dairy", ["cream", "fresh cream", "cooking cream", "malai"], ["en:creams", "en:cooking-creams", "en:fresh-creams"], 7, "fridge", { spoon: "heavy cream", meal: "Double Cream", cdb: "Cream" }),
  c("buttermilk", "Buttermilk (chaas)", "dairy", ["buttermilk", "chaas", "chaach", "masala chaas"], ["en:buttermilks"], 3, "fridge"),
  c("lassi", "Lassi", "dairy", ["lassi"], ["en:lassis"], 3, "fridge", { spoon: "yogurt", cdb: "Yoghurt" }),
  c("condensed milk", "Condensed milk", "dairy", ["condensed milk", "milkmaid"], ["en:sweetened-condensed-milks", "en:condensed-milks"], 180, "shelf", { cdb: "Condensed milk" }),
  c("milk powder", "Milk powder", "dairy", ["milk powder", "dairy whitener", "dairy whitner"], ["en:milk-powders", "en:dairy-whiteners"], 180, "shelf"),
  c("ice cream", "Ice cream", "dairy", ["ice cream", "icecream", "kulfi", "frozen dessert"], ["en:ice-creams", "en:frozen-desserts"], 60, "freezer", { cdb: "Vanilla ice-cream" }),
  c("khoya", "Khoya (mawa)", "dairy", ["khoya", "khoa", "mawa"], ["en:khoa"], 4, "fridge", { spoon: "ricotta" }),

  // grains & flours
  c("rice", "Rice", "grain", ["rice", "chawal", "sona masoori", "kolam"], ["en:rices", "en:white-rices", "en:long-grain-rices"], 365, "shelf"),
  c("basmati rice", "Basmati rice", "grain", ["basmati"], ["en:basmati-rices"], 365, "shelf"),
  c("brown rice", "Brown rice", "grain", ["brown rice"], ["en:brown-rices"], 180, "shelf"),
  c("atta", "Whole wheat flour (atta)", "grain", ["atta", "chakki atta", "whole wheat flour", "wheat flour"], ["en:whole-wheat-flours", "en:wheat-flours", "en:whole-grain-wheat-flours"], 120, "shelf", { spoon: "whole wheat flour", meal: "Flour" }),
  c("maida", "Maida (all-purpose flour)", "grain", ["maida", "all purpose flour", "refined flour", "plain flour"], ["en:white-wheat-flours", "en:all-purpose-flours"], 180, "shelf", { spoon: "all purpose flour", meal: "Plain Flour" }),
  c("besan", "Besan (gram flour)", "grain", ["besan", "gram flour", "chickpea flour"], ["en:chickpea-flours", "en:gram-flours"], 180, "shelf", { spoon: "chickpea flour", meal: "Chickpea Flour" }),
  c("sooji", "Sooji (semolina / rava)", "grain", ["sooji", "suji", "rava", "semolina", "upma rava"], ["en:semolinas", "en:durum-wheat-semolinas"], 180, "shelf", { spoon: "semolina" }),
  c("poha", "Poha (flattened rice)", "grain", ["poha", "flattened rice", "beaten rice", "aval"], ["en:flattened-rices", "en:poha"], 180, "shelf", { spoon: "rice flakes", meal: "Rice" }),
  c("oats", "Oats", "grain", ["oats", "rolled oats", "oatmeal", "masala oats"], ["en:oat-flakes", "en:rolled-oats", "en:oats", "en:porridge-oats"], 180, "shelf"),
  c("pasta", "Pasta", "grain", ["pasta", "penne", "spaghetti", "macaroni", "fusilli", "farfalle"], ["en:pastas", "en:spaghetti", "en:penne", "en:macaroni", "en:dry-pastas"], 365, "shelf"),
  c("noodles", "Noodles", "grain", ["noodles", "maggi", "hakka noodles", "ramen", "chowmein", "instant noodles", "yippee"], ["en:noodles", "en:instant-noodles", "en:asian-noodles"], 180, "shelf"),
  c("vermicelli", "Vermicelli (seviyan)", "grain", ["vermicelli", "seviyan", "sevai"], ["en:vermicelli"], 180, "shelf"),
  c("quinoa", "Quinoa", "grain", ["quinoa"], ["en:quinoa"], 365, "shelf"),
  c("ragi", "Ragi (finger millet)", "grain", ["ragi", "nachni", "finger millet"], ["en:finger-millet-flours"], 120, "shelf", { spoon: "millet" }),
  c("cornflour", "Cornflour", "grain", ["cornflour", "corn flour", "cornstarch", "corn starch"], ["en:corn-starches", "en:cornflours"], 365, "shelf", { spoon: "cornstarch", meal: "Cornstarch" }),
  c("cornflakes", "Cornflakes / cereal", "grain", ["cornflakes", "corn flakes", "muesli", "granola", "chocos", "cereal"], ["en:breakfast-cereals", "en:corn-flakes", "en:mueslis", "en:granolas"], 90, "shelf", { spoon: "cereal", cdb: "Grape Nut Cereal" }),

  // bakery
  c("bread", "Bread", "bakery", ["bread", "sandwich bread", "brown bread", "white bread", "multigrain bread", "pav", "bun"], ["en:breads", "en:sliced-breads", "en:white-breads", "en:wholemeal-breads", "en:sandwich-breads"], 4, "shelf"),
  c("tortilla", "Wraps / tortilla", "bakery", ["tortilla", "wrap", "wraps"], ["en:tortillas", "en:wheat-tortillas", "en:wraps"], 14, "shelf", { meal: "Flour Tortilla" }),
  c("biscuits", "Biscuits", "bakery", ["biscuit", "biscuits", "cookies", "parle g", "marie", "digestive"], ["en:biscuits", "en:cookies", "en:sweet-biscuits", "en:dry-biscuits"], 90, "shelf", { meal: "Digestive Biscuits" }),
  c("rusk", "Rusk", "bakery", ["rusk", "toast rusk"], ["en:rusks"], 90, "shelf", { spoon: "toast" }),

  // pulses & legumes
  c("toor dal", "Toor dal (arhar)", "pulse", ["toor", "tur dal", "toor dal", "arhar", "pigeon pea"], ["en:pigeon-peas", "en:split-pigeon-peas"], 270, "shelf", { spoon: "yellow lentils", meal: "Lentils" }),
  c("moong dal", "Moong dal", "pulse", ["moong", "mung", "moong dal", "green gram"], ["en:mung-beans", "en:split-mung-beans"], 270, "shelf", { spoon: "mung beans", meal: "Mung Beans" }),
  c("masoor dal", "Masoor dal (red lentils)", "pulse", ["masoor", "red lentil", "red lentils"], ["en:red-lentils", "en:split-red-lentils"], 270, "shelf", { spoon: "red lentils", meal: "Red Lentils" }),
  c("urad dal", "Urad dal", "pulse", ["urad", "black gram", "urad dal"], ["en:black-grams", "en:urad-dal"], 270, "shelf", { spoon: "urad dal", meal: "Lentils" }),
  c("chana dal", "Chana dal", "pulse", ["chana dal", "bengal gram"], ["en:split-chickpeas", "en:chana-dal"], 270, "shelf", { spoon: "chana dal", meal: "Lentils" }),
  c("lentils", "Lentils (dal)", "pulse", ["dal", "daal", "lentil", "lentils"], ["en:lentils", "en:dried-lentils"], 270, "shelf"),
  c("chickpeas", "Chickpeas (kabuli chana)", "pulse", ["chickpeas", "chickpea", "kabuli chana", "chole", "garbanzo"], ["en:chickpeas", "en:canned-chickpeas", "en:dried-chickpeas"], 270, "shelf"),
  c("black chana", "Black chana", "pulse", ["kala chana", "black chana", "black chickpeas"], ["en:black-chickpeas"], 270, "shelf", { spoon: "chickpeas", meal: "Chickpeas" }),
  c("kidney beans", "Rajma (kidney beans)", "pulse", ["rajma", "kidney beans", "red beans"], ["en:kidney-beans", "en:red-kidney-beans"], 270, "shelf"),
  c("soya chunks", "Soya chunks", "pulse", ["soya chunks", "soya", "nutrela", "soy chunks"], ["en:textured-soy-proteins", "en:soy-chunks"], 180, "shelf", { spoon: "textured vegetable protein" }),
  c("baked beans", "Baked beans", "pulse", ["baked beans"], ["en:baked-beans"], 365, "shelf"),
  c("peas", "Green peas", "veg", ["peas", "matar", "green peas", "frozen peas"], ["en:peas", "en:frozen-peas", "en:green-peas"], 5, "fridge", { meal: "Frozen Peas" }),
  c("corn", "Sweet corn", "veg", ["sweet corn", "corn", "bhutta", "makai"], ["en:sweet-corns", "en:corn"], 4, "fridge", { meal: "Corn On The Cob" }),

  // vegetables
  c("onion", "Onion", "veg", ["onion", "onions", "pyaz", "kanda"], ["en:onions"], 21, "shelf"),
  c("tomato", "Tomato", "veg", ["tomato", "tomatoes", "tamatar"], ["en:tomatoes", "en:fresh-tomatoes"], 5, "shelf", { fv: "Tomato" }),
  c("potato", "Potato", "veg", ["potato", "potatoes", "aloo"], ["en:potatoes"], 21, "shelf", { meal: "Potatoes" }),
  c("garlic", "Garlic", "veg", ["garlic", "lehsun", "lahsun"], ["en:garlic"], 30, "shelf"),
  c("ginger", "Ginger", "veg", ["ginger", "adrak"], ["en:ginger"], 21, "fridge", { cdb: "Ginger" }),
  c("ginger garlic paste", "Ginger-garlic paste", "sauce", ["ginger garlic paste"], ["en:ginger-garlic-pastes"], 30, "fridge", { meal: "Ginger Garlic Paste" }),
  c("green chilli", "Green chilli", "veg", ["green chilli", "green chili", "hari mirch", "chilli", "chillies"], ["en:chili-peppers"], 7, "fridge", { spoon: "green chili pepper", meal: "Green Chilli" }),
  c("coriander leaves", "Coriander leaves (dhania)", "veg", ["coriander leaves", "dhania", "cilantro", "coriander"], ["en:coriander-leaves"], 3, "fridge", { spoon: "cilantro", meal: "Coriander" }),
  c("mint", "Mint (pudina)", "veg", ["mint", "pudina"], ["en:mint"], 3, "fridge", { cdb: "Mint" }),
  c("curry leaves", "Curry leaves", "veg", ["curry leaves", "kadi patta", "kadi patta"], [], 5, "fridge"),
  c("spinach", "Spinach (palak)", "veg", ["spinach", "palak"], ["en:spinachs", "en:spinach"], 3, "fridge"),
  c("fenugreek leaves", "Methi leaves", "veg", ["methi", "fenugreek leaves"], [], 3, "fridge", { spoon: "fenugreek leaves", meal: "Fenugreek" }),
  c("cabbage", "Cabbage", "veg", ["cabbage", "patta gobi", "band gobi"], ["en:cabbages"], 10, "fridge"),
  c("cauliflower", "Cauliflower (gobi)", "veg", ["cauliflower", "gobi", "phool gobi"], ["en:cauliflowers"], 7, "fridge"),
  c("broccoli", "Broccoli", "veg", ["broccoli"], ["en:broccoli"], 5, "fridge"),
  c("carrot", "Carrot", "veg", ["carrot", "carrots", "gajar"], ["en:carrots"], 14, "fridge", { meal: "Carrots", cdb: "Carrot" }),
  c("capsicum", "Capsicum", "veg", ["capsicum", "bell pepper", "shimla mirch", "red pepper", "yellow pepper"], ["en:sweet-peppers", "en:bell-peppers"], 7, "fridge", { spoon: "bell pepper", meal: "Green Pepper" }),
  c("eggplant", "Brinjal (baingan)", "veg", ["brinjal", "baingan", "eggplant", "aubergine"], ["en:eggplants", "en:aubergines"], 5, "fridge", { meal: "Aubergine" }),
  c("okra", "Bhindi (okra)", "veg", ["bhindi", "okra", "lady finger", "ladyfinger"], ["en:okras"], 4, "fridge"),
  c("bottle gourd", "Lauki (bottle gourd)", "veg", ["lauki", "bottle gourd", "dudhi", "ghiya"], [], 6, "fridge", { spoon: "zucchini", meal: "Courgettes" }),
  c("cucumber", "Cucumber", "veg", ["cucumber", "kheera", "kakdi"], ["en:cucumbers"], 6, "fridge", { cdb: "Cucumber" }),
  c("green beans", "Green beans", "veg", ["french beans", "green beans", "beans"], ["en:green-beans"], 5, "fridge", { meal: "Green Beans" }),
  c("mushroom", "Mushroom", "veg", ["mushroom", "mushrooms", "button mushroom"], ["en:mushrooms", "en:button-mushrooms"], 4, "fridge", { meal: "Mushrooms" }),
  c("beetroot", "Beetroot", "veg", ["beetroot", "beet", "chukandar"], ["en:beetroots"], 14, "fridge"),
  c("radish", "Radish (mooli)", "veg", ["radish", "mooli"], ["en:radishes"], 7, "fridge"),
  c("sweet potato", "Sweet potato", "veg", ["sweet potato", "shakarkandi"], ["en:sweet-potatoes"], 14, "shelf"),
  c("pumpkin", "Pumpkin", "veg", ["pumpkin", "kaddu", "squash"], ["en:pumpkins"], 14, "shelf", { fv: "Pumpkin", meal: "Butternut Squash" }),
  c("lettuce", "Lettuce", "veg", ["lettuce", "iceberg"], ["en:lettuces"], 4, "fridge"),
  c("spring onion", "Spring onion", "veg", ["spring onion", "scallion", "green onion"], ["en:spring-onions"], 5, "fridge", { meal: "Spring Onions" }),
  c("lemon", "Lemon (nimbu)", "fruit", ["lemon", "lemons", "nimbu", "lime", "limes"], ["en:lemons", "en:limes"], 14, "fridge", { fv: "Lemon", cdb: "Lemon juice" }),
  c("coconut", "Coconut", "fruit", ["coconut", "nariyal", "grated coconut", "desiccated coconut"], ["en:coconuts", "en:desiccated-coconuts"], 7, "fridge"),

  // fruit
  c("apple", "Apple", "fruit", ["apple", "apples", "seb"], ["en:apples"], 21, "fridge", { fv: "Apple", meal: "Apples", cdb: "Apple" }),
  c("banana", "Banana", "fruit", ["banana", "bananas", "kela"], ["en:bananas"], 5, "shelf", { fv: "Banana", cdb: "Banana" }),
  c("orange", "Orange", "fruit", ["orange", "oranges", "santra", "mandarin", "kinnow", "tangerine"], ["en:oranges", "en:mandarins"], 14, "fridge", { fv: "Orange", cdb: "Orange" }),
  c("mango", "Mango", "fruit", ["mango", "mangoes", "aam", "alphonso"], ["en:mangoes"], 5, "shelf", { fv: "Mango", cdb: "Mango" }),
  c("grapes", "Grapes", "fruit", ["grapes", "grape", "angoor"], ["en:grapes"], 7, "fridge", { fv: "Grape", cdb: "Grapes" }),
  c("pineapple", "Pineapple", "fruit", ["pineapple", "ananas"], ["en:pineapples"], 5, "shelf", { fv: "Pineapple", cdb: "Pineapple" }),
  c("watermelon", "Watermelon", "fruit", ["watermelon", "tarbooz"], ["en:watermelons"], 5, "shelf", { fv: "Watermelon", cdb: "Watermelon" }),
  c("melon", "Melon (kharbooja)", "fruit", ["muskmelon", "melon", "kharbooja", "cantaloupe"], ["en:melons"], 5, "shelf", { fv: "Melon", cdb: "Cantaloupe" }),
  c("papaya", "Papaya", "fruit", ["papaya", "papita"], ["en:papayas"], 5, "shelf", { fv: "Papaya", cdb: "Papaya" }),
  c("pomegranate", "Pomegranate (anar)", "fruit", ["pomegranate", "anar"], ["en:pomegranates"], 14, "fridge", { fv: "Pomegranate", cdb: "Pomegranate juice" }),
  c("guava", "Guava (amrood)", "fruit", ["guava", "amrood", "peru"], ["en:guavas"], 5, "shelf", { fv: "Guava" }),
  c("strawberry", "Strawberry", "fruit", ["strawberry", "strawberries"], ["en:strawberries"], 3, "fridge", { fv: "Strawberry", meal: "Strawberries", cdb: "Strawberries" }),
  c("kiwi", "Kiwi", "fruit", ["kiwi", "kiwifruit"], ["en:kiwis"], 7, "fridge", { fv: "Kiwi", cdb: "Kiwi" }),
  c("pear", "Pear", "fruit", ["pear", "pears", "nashpati"], ["en:pears"], 7, "fridge", { fv: "Pear" }),
  c("peach", "Peach", "fruit", ["peach", "peaches", "aadu"], ["en:peaches"], 5, "fridge", { fv: "Peach", cdb: "Peach nectar" }),
  c("plum", "Plum", "fruit", ["plum", "plums", "aloo bukhara"], ["en:plums"], 5, "fridge", { fv: "Plum" }),
  c("cherry", "Cherry", "fruit", ["cherry", "cherries"], ["en:cherries"], 5, "fridge", { fv: "Cherry", cdb: "Cherry" }),
  c("blueberry", "Blueberries", "fruit", ["blueberry", "blueberries"], ["en:blueberries"], 5, "fridge", { fv: "Blueberry", meal: "Blueberries", cdb: "Blueberries" }),
  c("lychee", "Lychee", "fruit", ["lychee", "litchi"], ["en:lychees"], 5, "fridge", { fv: "Lychee" }),
  c("fig", "Fig (anjeer)", "fruit", ["fig", "figs", "anjeer", "anjir"], ["en:figs"], 4, "fridge", { fv: "Fig", meal: "Figs" }),
  c("jackfruit", "Jackfruit", "fruit", ["jackfruit", "kathal"], ["en:jackfruits"], 4, "shelf", { fv: "Jackfruit" }),
  c("avocado", "Avocado", "fruit", ["avocado", "butter fruit"], ["en:avocados"], 4, "shelf", { fv: "Avocado" }),
  c("dates", "Dates (khajoor)", "nut", ["dates", "khajoor", "khajur"], ["en:dates", "en:dried-dates"], 180, "shelf", { meal: "Medjool Dates" }),
  c("raisins", "Raisins (kishmish)", "nut", ["raisins", "kishmish", "sultanas"], ["en:raisins", "en:sultanas"], 180, "shelf"),

  // proteins
  c("eggs", "Eggs", "protein", ["egg", "eggs", "anda"], ["en:eggs", "en:chicken-eggs", "en:free-range-eggs"], 21, "fridge", { cdb: "Egg" }),
  c("chicken", "Chicken", "protein", ["chicken", "murgh", "chicken breast", "drumsticks"], ["en:chickens", "en:chicken-meats", "en:chicken-breasts", "en:poultries"], 2, "fridge"),
  c("mutton", "Mutton", "protein", ["mutton", "goat meat", "lamb", "keema"], ["en:lamb-meats", "en:goat-meats", "en:muttons"], 2, "fridge", { spoon: "lamb", meal: "Lamb" }),
  c("fish", "Fish", "protein", ["fish", "rohu", "pomfret", "surmai", "salmon", "basa", "tuna"], ["en:fishes", "en:fish-fillets", "en:tunas", "en:salmons"], 2, "fridge", { meal: "Salmon" }),
  c("prawns", "Prawns", "protein", ["prawn", "prawns", "shrimp", "shrimps", "jhinga"], ["en:shrimps", "en:prawns"], 2, "fridge", { meal: "King Prawns" }),
  c("tofu", "Tofu", "protein", ["tofu", "bean curd"], ["en:tofu", "en:tofus"], 5, "fridge"),

  // spices
  c("turmeric", "Turmeric (haldi)", "spice", ["turmeric", "haldi"], ["en:turmeric", "en:ground-turmeric"], 365, "shelf", { meal: "Turmeric" }),
  c("cumin", "Cumin (jeera)", "spice", ["cumin", "jeera", "zeera"], ["en:cumin", "en:cumin-seeds"], 365, "shelf"),
  c("chilli powder", "Red chilli powder", "spice", ["chilli powder", "chili powder", "lal mirch", "kashmiri mirch", "red chilli"], ["en:chili-powders", "en:chilli-powders"], 365, "shelf", { spoon: "chili powder", meal: "Chilli Powder" }),
  c("garam masala", "Garam masala", "spice", ["garam masala", "masala", "kitchen king", "chole masala", "pav bhaji masala", "biryani masala", "sambar masala"], ["en:garam-masalas", "en:spice-mixes"], 365, "shelf"),
  c("coriander powder", "Coriander powder", "spice", ["coriander powder", "dhania powder"], ["en:ground-coriander"], 365, "shelf", { meal: "Ground Coriander" }),
  c("mustard seeds", "Mustard seeds (rai)", "spice", ["mustard seeds", "rai", "sarson"], ["en:mustard-seeds"], 365, "shelf"),
  c("black pepper", "Black pepper", "spice", ["black pepper", "kali mirch", "pepper"], ["en:black-peppers", "en:peppers-spice"], 365, "shelf", { cdb: "Black pepper" }),
  c("cardamom", "Cardamom (elaichi)", "spice", ["cardamom", "elaichi"], ["en:cardamom"], 365, "shelf", { cdb: "Cardamom" }),
  c("cinnamon", "Cinnamon (dalchini)", "spice", ["cinnamon", "dalchini"], ["en:cinnamon"], 365, "shelf", { cdb: "Cinnamon" }),
  c("cloves", "Cloves (laung)", "spice", ["cloves", "laung", "lavang"], ["en:cloves"], 365, "shelf"),
  c("asafoetida", "Hing (asafoetida)", "spice", ["hing", "asafoetida"], ["en:asafoetida"], 365, "shelf"),
  c("bay leaf", "Bay leaf (tej patta)", "spice", ["bay leaf", "tej patta", "tejpatta"], ["en:bay-leaves"], 365, "shelf"),
  c("fennel seeds", "Fennel (saunf)", "spice", ["fennel", "saunf"], ["en:fennel-seeds"], 365, "shelf", { meal: "Fennel Seeds" }),
  c("ajwain", "Ajwain (carom)", "spice", ["ajwain", "carom"], ["en:carom-seeds"], 365, "shelf", { spoon: "carom seeds" }),
  c("kasuri methi", "Kasuri methi", "spice", ["kasuri methi", "dried fenugreek"], [], 365, "shelf", { spoon: "dried fenugreek leaves", meal: "Fenugreek" }),
  c("salt", "Salt", "spice", ["salt", "iodised salt", "iodized salt", "rock salt", "sendha namak", "namak"], ["en:salts", "en:table-salts", "en:iodized-salts"], 730, "shelf", { cdb: "Salt" }),

  // sauces & condiments
  c("ketchup", "Tomato ketchup", "sauce", ["ketchup", "tomato sauce", "tomato ketchup"], ["en:ketchup", "en:tomato-ketchups", "en:tomato-sauces"], 180, "shelf"),
  c("soy sauce", "Soy sauce", "sauce", ["soy sauce", "soya sauce"], ["en:soy-sauces"], 365, "shelf"),
  c("vinegar", "Vinegar", "sauce", ["vinegar", "sirka"], ["en:vinegars"], 365, "shelf"),
  c("chilli sauce", "Chilli sauce", "sauce", ["chilli sauce", "chili sauce", "hot sauce", "sriracha", "schezwan", "tabasco"], ["en:chili-sauces", "en:hot-sauces"], 180, "shelf", { spoon: "hot sauce", meal: "Chilli Sauce", cdb: "Tabasco sauce" }),
  c("mayonnaise", "Mayonnaise", "sauce", ["mayonnaise", "mayo", "veg mayo"], ["en:mayonnaises"], 60, "fridge"),
  c("pasta sauce", "Pasta sauce", "sauce", ["pasta sauce", "marinara", "arrabbiata", "pizza sauce"], ["en:pasta-sauces", "en:tomato-based-sauces"], 7, "fridge", { spoon: "pasta sauce", meal: "Tomato Puree" }),
  c("tomato puree", "Tomato puree", "sauce", ["tomato puree", "passata", "tomato paste"], ["en:tomato-purees", "en:tomato-pastes", "en:passatas"], 5, "fridge", { meal: "Tomato Puree" }),
  c("pickle", "Pickle (achar)", "sauce", ["pickle", "achar", "achaar"], ["en:pickles", "en:indian-pickles"], 365, "shelf"),
  c("mustard", "Mustard sauce", "sauce", ["mustard", "kasundi", "dijon"], ["en:mustards"], 180, "fridge", { meal: "Dijon Mustard" }),
  c("tamarind", "Tamarind (imli)", "sauce", ["tamarind", "imli"], ["en:tamarinds", "en:tamarind-pastes"], 180, "shelf"),
  c("coconut milk", "Coconut milk", "sauce", ["coconut milk", "coconut cream"], ["en:coconut-milks", "en:coconut-creams"], 4, "fridge", { cdb: "Coconut milk" }),
  c("peanut butter", "Peanut butter", "sweet", ["peanut butter"], ["en:peanut-butters"], 90, "shelf"),
  c("chocolate spread", "Chocolate spread", "sweet", ["nutella", "chocolate spread", "hazelnut spread", "choco spread"], ["en:hazelnut-spreads", "en:chocolate-spreads", "en:cocoa-and-hazelnuts-spreads"], 90, "shelf", { spoon: "nutella", meal: "Nutella", cdb: "Chocolate syrup" }),
  c("jam", "Jam", "sweet", ["jam", "jelly", "marmalade", "fruit spread", "preserve"], ["en:jams", "en:fruit-jams", "en:marmalades", "en:fruit-preserves"], 90, "fridge"),
  c("honey", "Honey", "sweet", ["honey", "shahad"], ["en:honeys"], 730, "shelf", { cdb: "Honey" }),
  c("sugar", "Sugar", "sweet", ["sugar", "cheeni", "chini", "brown sugar"], ["en:sugars", "en:white-sugars", "en:granulated-sugars", "en:brown-sugars"], 730, "shelf", { cdb: "Sugar" }),
  c("jaggery", "Jaggery (gur)", "sweet", ["jaggery", "gur", "gud"], ["en:jaggery", "en:jaggeries"], 365, "shelf", { spoon: "brown sugar", meal: "Brown Sugar", cdb: "Brown sugar" }),
  c("chocolate", "Chocolate", "sweet", ["chocolate", "dairy milk", "dark chocolate", "kitkat", "5 star", "bournville"], ["en:chocolates", "en:dark-chocolates", "en:milk-chocolates", "en:chocolate-bars"], 180, "shelf", { meal: "Dark Chocolate", cdb: "Chocolate" }),
  c("cocoa powder", "Cocoa powder", "sweet", ["cocoa", "cocoa powder", "bournvita", "drinking chocolate", "hot chocolate"], ["en:cocoa-powders", "en:cocoa-and-chocolate-powders", "en:chocolate-powders"], 365, "shelf", { cdb: "Cocoa powder" }),
  c("maple syrup", "Syrup", "sweet", ["maple syrup", "syrup", "rooh afza", "roohafza", "sharbat"], ["en:syrups", "en:maple-syrups"], 365, "shelf", { cdb: "Maple syrup" }),
  c("custard powder", "Custard powder", "sweet", ["custard"], ["en:custard-powders"], 365, "shelf", { meal: "Custard Powder" }),
  c("baking soda", "Baking soda", "spice", ["baking soda", "soda bicarbonate", "meetha soda", "cooking soda"], ["en:baking-sodas", "en:sodium-bicarbonates"], 365, "shelf", { meal: "Bicarbonate Of Soda" }),
  c("baking powder", "Baking powder", "spice", ["baking powder"], ["en:baking-powders"], 365, "shelf"),
  c("yeast", "Yeast", "spice", ["yeast", "instant yeast", "dry yeast"], ["en:yeasts", "en:baker-s-yeasts"], 120, "fridge", { meal: "Instant Yeast" }),

  // oils
  c("vegetable oil", "Cooking oil", "oil", ["oil", "refined oil", "sunflower oil", "vegetable oil", "rice bran oil", "groundnut oil", "fortune"], ["en:vegetable-oils", "en:sunflower-oils", "en:refined-oils", "en:rice-bran-oils", "en:peanut-oils"], 365, "shelf", { meal: "Vegetable Oil" }),
  c("olive oil", "Olive oil", "oil", ["olive oil", "extra virgin"], ["en:olive-oils", "en:extra-virgin-olive-oils"], 365, "shelf"),
  c("mustard oil", "Mustard oil", "oil", ["mustard oil", "kachi ghani", "sarson ka tel"], ["en:mustard-oils"], 365, "shelf", { spoon: "mustard oil", meal: "Vegetable Oil" }),
  c("coconut oil", "Coconut oil", "oil", ["coconut oil", "parachute"], ["en:coconut-oils"], 365, "shelf"),

  // nuts & seeds
  c("almonds", "Almonds (badam)", "nut", ["almond", "almonds", "badam"], ["en:almonds"], 180, "shelf", { cdb: "Almond" }),
  c("cashews", "Cashews (kaju)", "nut", ["cashew", "cashews", "kaju"], ["en:cashew-nuts", "en:cashews"], 180, "shelf"),
  c("peanuts", "Peanuts (moongphali)", "nut", ["peanut", "peanuts", "groundnut", "moongphali"], ["en:peanuts", "en:roasted-peanuts"], 180, "shelf"),
  c("walnuts", "Walnuts (akhrot)", "nut", ["walnut", "walnuts", "akhrot"], ["en:walnuts"], 180, "shelf", { meal: "Walnuts" }),
  c("pistachios", "Pistachios (pista)", "nut", ["pistachio", "pistachios", "pista"], ["en:pistachios"], 180, "shelf", { meal: "Pistachios" }),
  c("sesame seeds", "Sesame (til)", "nut", ["sesame", "til"], ["en:sesame-seeds"], 180, "shelf"),

  // snacks
  c("chips", "Chips", "snack", ["chips", "crisps", "lays", "wafers", "kurkure", "nachos"], ["en:crisps", "en:potato-crisps", "en:chips-and-fries", "en:tortilla-chips"], 60, "shelf", { spoon: "potato chips" }),
  c("namkeen", "Namkeen", "snack", ["namkeen", "bhujia", "mixture", "haldiram", "sev"], ["en:salty-snacks", "en:indian-snacks"], 90, "shelf", { spoon: "snack mix" }),
  c("papad", "Papad", "snack", ["papad", "papadum", "appalam"], ["en:papads", "en:poppadoms"], 180, "shelf", { spoon: "papadums" }),

  // beverages
  c("orange juice", "Orange juice", "bev", ["orange juice", "orange drink", "real orange"], ["en:orange-juices", "en:orange-nectars", "en:squeezed-orange-juices"], 5, "fridge", { meal: "Orange Juice", cdb: "Orange juice", fv: "Orange" }),
  c("apple juice", "Apple juice", "bev", ["apple juice"], ["en:apple-juices", "en:apple-nectars"], 5, "fridge", { cdb: "Apple juice", fv: "Apple" }),
  c("pineapple juice", "Pineapple juice", "bev", ["pineapple juice"], ["en:pineapple-juices", "en:pineapple-nectars"], 5, "fridge", { cdb: "Pineapple juice", fv: "Pineapple" }),
  c("mango juice", "Mango juice / drink", "bev", ["mango juice", "mango drink", "maaza", "frooti", "slice", "mango nectar", "aam panna", "mango pulp"], ["en:mango-nectars", "en:mango-juices", "en:mango-drinks"], 5, "fridge", { spoon: "mango juice", cdb: "Mango", fv: "Mango" }),
  c("grape juice", "Grape juice", "bev", ["grape juice"], ["en:grape-juices"], 5, "fridge", { cdb: "Grape juice", fv: "Grape" }),
  c("cranberry juice", "Cranberry juice", "bev", ["cranberry juice", "cranberry"], ["en:cranberry-juices", "en:cranberry-nectars"], 5, "fridge", { cdb: "Cranberry juice", fv: "Cranberry" }),
  c("pomegranate juice", "Pomegranate juice", "bev", ["pomegranate juice", "anar juice"], ["en:pomegranate-juices"], 5, "fridge", { cdb: "Pomegranate juice", fv: "Pomegranate" }),
  c("mixed fruit juice", "Mixed fruit juice", "bev", ["mixed fruit juice", "mixed fruit drink", "fruit juice", "juice", "nectar", "real juice", "tropicana", "paper boat"], ["en:fruit-juices", "en:juices-and-nectars", "en:multifruit-juices", "en:fruit-nectars"], 5, "fridge", { spoon: "fruit juice", cdb: "Fruit juice" }),
  c("tomato juice", "Tomato juice", "bev", ["tomato juice"], ["en:tomato-juices"], 5, "fridge", { cdb: "Tomato juice", fv: "Tomato" }),
  c("lemonade", "Lemonade / nimbu pani", "bev", ["lemonade", "nimbu pani", "lemon drink", "limca"], ["en:lemonades", "en:lemon-sodas"], 5, "fridge", { cdb: "Lemonade", fv: "Lemon" }),
  c("cola", "Cola", "bev", ["cola", "coke", "coca cola", "pepsi", "thums up", "thumbs up"], ["en:colas", "en:diet-colas"], 180, "shelf", { cdb: "Coca-Cola" }),
  c("lemon soda", "Lemon-lime soda", "bev", ["sprite", "7up", "7 up", "mountain dew", "sierra mist"], ["en:lemon-lime-sodas"], 180, "shelf", { cdb: "Sprite" }),
  c("soda water", "Soda water", "bev", ["soda", "soda water", "club soda", "sparkling water", "carbonated water"], ["en:sodas", "en:carbonated-waters", "en:sparkling-waters"], 180, "shelf", { cdb: "Soda water" }),
  c("ginger ale", "Ginger ale", "bev", ["ginger ale", "ginger beer"], ["en:ginger-ales", "en:ginger-beers"], 180, "shelf", { cdb: "Ginger ale" }),
  c("tonic water", "Tonic water", "bev", ["tonic", "tonic water"], ["en:tonic-waters"], 180, "shelf", { cdb: "Tonic water" }),
  c("coffee", "Coffee", "bev", ["coffee", "nescafe", "bru", "filter coffee", "instant coffee", "cold coffee"], ["en:coffees", "en:instant-coffees", "en:ground-coffees", "en:coffee-beans"], 180, "shelf", { cdb: "Coffee" }),
  c("espresso", "Espresso", "bev", ["espresso"], ["en:espressos"], 180, "shelf", { spoon: "espresso", cdb: "Espresso" }),
  c("tea", "Tea (chai)", "bev", ["tea", "chai", "chai patti", "tata tea", "red label", "taj mahal", "green tea", "iced tea"], ["en:teas", "en:black-teas", "en:green-teas", "en:iced-teas", "en:tea-bags"], 365, "shelf", { cdb: "Tea" }),
  c("coconut water", "Coconut water", "bev", ["coconut water", "tender coconut"], ["en:coconut-waters"], 3, "fridge", { spoon: "coconut water", cdb: "Water" }),
  c("energy drink", "Energy drink", "bev", ["energy drink", "red bull", "monster"], ["en:energy-drinks"], 180, "shelf", { spoon: "energy drink" }),
  c("water", "Packaged water", "bev", ["water", "mineral water", "bisleri", "kinley", "aquafina"], ["en:waters", "en:mineral-waters", "en:spring-waters"], 365, "shelf", { cdb: "Water" }),
  c("flavoured milk", "Flavoured milk", "bev", ["flavoured milk", "flavored milk", "milkshake", "cold coffee", "chocolate milk", "badam milk"], ["en:flavoured-milks", "en:milkshakes", "en:chocolate-milks"], 5, "fridge", { spoon: "chocolate milk", cdb: "Milk" }),
];

// stuff people usually have but recipes shouldn't hinge on
export const STAPLES = new Set(["salt", "water", "sugar", "vegetable oil", "turmeric"]);
