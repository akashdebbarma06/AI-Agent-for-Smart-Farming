# Mandi (Market) Price Information

> **⚠️ DEMO DATA — SAMPLE ONLY**  
> **The prices listed in this document are FICTITIOUS SAMPLE DATA for development and demonstration purposes only.**  
> **Real-time mandi prices change daily and must be fetched from live APIs such as:**
> - **Agmarknet (data.gov.in):** https://data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi
> - **eNAM Portal:** https://www.enam.gov.in
> - **State agriculture department market portals**
>
> **KrishiMitra AI will clearly label when displaying sample vs. live data.**

---

## What is a Mandi?

A **mandi** (agricultural produce market) is a regulated wholesale market where farmers sell their produce to traders, processors, and exporters. Prices at the mandi are determined by supply, demand, and quality of produce on any given day.

Key concepts:
- **MSP (Minimum Support Price):** The floor price set by the Government of India below which the government will purchase the commodity. Does not apply to all crops.
- **Modal Price:** The most commonly traded price on a particular day — useful as a reference
- **Min/Max Price:** The price range of all transactions in a session

---

## Sample Reference Prices (DEMO — Not Current)

> The following prices are illustrative examples only. Actual prices vary significantly by location, season, and quality.

### Vegetables (₹ per quintal — 100 kg)

| Commodity | Sample Min Price | Sample Modal Price | Sample Max Price | Season Reference |
|-----------|-----------------|-------------------|-----------------|-----------------|
| Tomato | ₹ 800 | ₹ 1,200 | ₹ 2,500 | Kharif peak |
| Onion | ₹ 1,000 | ₹ 1,800 | ₹ 3,500 | Post-Kharif |
| Potato | ₹ 700 | ₹ 1,100 | ₹ 1,800 | Rabi harvest |
| Brinjal | ₹ 400 | ₹ 800 | ₹ 1,400 | Year-round |
| Cauliflower | ₹ 300 | ₹ 600 | ₹ 1,200 | Winter Rabi |
| Green Chilli | ₹ 1,500 | ₹ 2,500 | ₹ 5,000 | Varies widely |
| Bitter Gourd | ₹ 600 | ₹ 1,200 | ₹ 2,000 | Summer |
| Okra (Bhindi) | ₹ 800 | ₹ 1,400 | ₹ 2,200 | Summer-Kharif |

### Grains and Pulses (₹ per quintal)

| Commodity | Sample Modal Price | 2023–24 MSP (Govt.) | Notes |
|-----------|-------------------|---------------------|-------|
| Paddy (Common) | ₹ 2,183 | ₹ 2,183 | MSP-linked |
| Wheat | ₹ 2,275 | ₹ 2,275 | MSP-linked |
| Maize | ₹ 2,090 | ₹ 2,090 | MSP-linked |
| Soybean | ₹ 4,600 | ₹ 4,600 | MSP-linked |
| Groundnut | ₹ 6,377 | ₹ 6,377 | MSP (in-shell) |
| Chickpea (Gram) | ₹ 5,440 | ₹ 5,440 | MSP-linked |
| Mustard | ₹ 5,650 | ₹ 5,650 | MSP-linked |
| Cotton (Long staple) | ₹ 7,020 | ₹ 7,020 | MSP-linked |

*MSP values are from Government of India — these are reference baselines only; actual mandi prices can be above or below MSP.*

---

## Factors That Affect Mandi Prices

- **Season:** Prices are lowest at harvest (peak supply) and highest off-season
- **Location:** Mandis close to consumption centres (cities) tend to offer better prices
- **Quality:** Clean, graded, dry produce commands a premium
- **Transport cost:** Deduct 2–5% for transportation and market charges
- **Arrivals on the day:** Large arrivals drive prices down; low arrivals push prices up

---

## How Farmers Can Get Better Prices

1. **Avoid distress selling** at harvest peak — store if possible (use FCI/NABARD-linked storage)
2. **Grade and sort** produce — remove damaged/small items; uniform size fetches premium
3. **Check multiple mandis** before selling — digital platforms like eNAM allow price comparison
4. **Form FPOs (Farmer Producer Organisations)** — collective selling gives bargaining power
5. **Use MSP procurement** when market prices fall below MSP — register with local APMC

---

## Connecting to Real-Time Data

When this application is connected to live APIs, the following will be retrieved in real-time:
- Today's arrival and price data from Agmarknet
- eNAM platform prices for enrolled commodities
- State-level APMC price bulletins

**Until live APIs are connected, all price data shown by this application is sample/demo data and should NOT be used for actual selling decisions.**

---

## Advisory Note

Always verify prices at your nearest mandi directly before making selling decisions. Prices can vary ₹100–500/quintal between mandis on the same day. Use digital tools like the eNAM app, Kisan Suvidha app, or your state's agriculture department price board for current data.
