import { GoogleGenAI, Type, Chat } from "@google/genai";
import type {
  MenuItem,
  Ingredient,
  SalesHistoryRecord,
  GeneratedMenuItem,
  Forecast,
  ReorderSuggestion,
  DynamicPriceSuggestion,
  ProfitLossStats,
  BasketAnalysis,
  MarketingCampaignSuggestion,
  OperationalCost,
  WasteRecord,
  Supplier,
  SupplierPriceListItem,
  MenuEngineeringAnalysis,
  WastePreventionAdvice,
  CompetitorAnalysis,
} from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY! });
let chat: Chat;

const handleApiError = (error: unknown, functionName: string): never => {
    console.error(`Error in ${functionName}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('API_KEY')) {
            throw new Error('Kunci API tidak valid atau hilang. Pastikan sudah dikonfigurasi dengan benar.');
        }
        if (error.message.includes('400')) {
             throw new Error('Permintaan ke AI tidak valid. Data yang dikirim mungkin salah format.');
        }
    }
    throw new Error('Gagal mendapatkan respons dari AI. Silakan coba lagi nanti.');
};

// Helper to format data into strings for prompts
const formatIngredients = (ingredients: Ingredient[]) =>
  ingredients.map(i => `${i.name} (ID: ${i.id}, Stok: ${i.stockLevel} ${i.unit}, Harga: ${i.price}/${i.unit})`).join('\n');

const formatMenuItems = (menuItems: MenuItem[]) =>
  menuItems.map(m => `${m.name} (ID: ${m.id}, Harga Jual: ${m.sellingPrice}, HPP: ${m.cogs}, Margin: ${m.actualMargin.toFixed(1)}%)`).join('\n');
  
const formatSalesHistory = (salesHistory: SalesHistoryRecord[], menuItems: MenuItem[], days = 7) => {
    const menuItemsMap = new Map(menuItems.map(item => [item.id, item.name]));
    
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    const dateLimitString = dateLimit.toISOString().split('T')[0];

    const recentHistory = salesHistory.filter(s => s.date >= dateLimitString);
    if (recentHistory.length === 0) return "Tidak ada data penjualan dalam periode ini.";
    return recentHistory.map(s => `${s.date}: ${menuItemsMap.get(s.menuItemId) || s.menuItemId} terjual ${s.quantitySold} unit`).join('\n');
};

const formatWasteHistory = (wasteHistory: WasteRecord[], ingredients: Ingredient[], days = 14) => {
    const ingredientsMap = new Map(ingredients.map(i => [i.id, i.name]));
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    const dateLimitString = dateLimit.toISOString().split('T')[0];

    const recentWaste = wasteHistory.filter(w => w.date >= dateLimitString);
    if (recentWaste.length === 0) return "Tidak ada data buangan dalam periode ini.";
    
    return recentWaste.map(w =>
        `${w.date}: ${ingredientsMap.get(w.ingredientId) || 'Unknown Ingredient'} terbuang ${w.quantity} unit karena ${w.reason} (kerugian ${w.cost})`
    ).join('\n');
};

const formatForecasts = (forecasts: { itemName: string; forecast: Forecast }[]): string => {
    if (forecasts.length === 0) return "Tidak ada proyeksi penjualan yang relevan.";
    return forecasts
        .map(f => `Proyeksi untuk "${f.itemName}":\n${f.forecast.dailyForecasts.map(d => `- ${d.day}: ${d.predictedSales} unit`).join('\n')}`)
        .join('\n\n');
};

const formatSuppliersWithPrices = (suppliers: Supplier[], supplierPrices: SupplierPriceListItem[], ingredients: Ingredient[]): string => {
    if (suppliers.length === 0) return "Tidak ada data supplier.";
    const ingredientsMap = new Map(ingredients.map(i => [i.id, i.name]));
    
    return suppliers.map(s => {
        const prices = supplierPrices
            .filter(sp => sp.supplierId === s.id)
            .map(sp => {
                const ingredientName = ingredientsMap.get(sp.ingredientId);
                return ingredientName ? `- ${ingredientName}: ${sp.price}` : null;
            })
            .filter(Boolean)
            .join('\n');
        return `Supplier: ${s.name} (ID: ${s.id})\n${prices || 'Tidak ada daftar harga.'}`;
    }).join('\n\n');
};


export const getMarginFixRecommendation = async (menuItem: MenuItem): Promise<string> => {
    try {
        const prompt = `
          Menu item saya "${menuItem.name}" sedang mengalami masalah margin.
          - Harga Jual: ${menuItem.sellingPrice}
          - Modal (HPP): ${menuItem.cogs}
          - Margin Aktual: ${menuItem.actualMargin.toFixed(1)}%
          - Target Margin: ${menuItem.targetMargin}%
          
          Berikan rekomendasi konkret dalam format markdown untuk memperbaiki margin. Fokus pada:
          1.  Analisis penyebab masalah (misalnya kenaikan harga bahan baku).
          2.  Saran penyesuaian harga jual dengan justifikasi.
          3.  Ide efisiensi resep jika memungkinkan.
          4.  Saran bundling atau promosi untuk meningkatkan penjualan.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        return response.text;
    } catch (error) {
        handleApiError(error, 'getMarginFixRecommendation');
    }
};

export const getSalesForecast = async (menuItem: MenuItem, salesHistory: SalesHistoryRecord[]): Promise<Forecast> => {
    try {
        const relevantSales = salesHistory.filter(s => s.menuItemId === menuItem.id);
        const salesHistoryString = relevantSales.map(s => `${s.date}: ${s.quantitySold} unit`).join('\n');
        
        const prompt = `
        Analyze the following sales data for the menu item "${menuItem.name}" and provide a 7-day sales forecast. Consider potential weekly patterns (weekends vs weekdays).

        Historical Sales Data (last 90 days):
        ${salesHistoryString}

        Today is ${new Date().toLocaleDateString('id-ID', { weekday: 'long' })}. Provide a forecast for the next 7 days (e.g., Selasa, Rabu, etc.), starting from tomorrow.

        Provide the output in a structured JSON format. The JSON should have two keys: "summary" and "dailyForecasts".
        - "summary": A brief, insightful text summary of the sales trend and forecast, mentioning any seasonal or weekly patterns observed.
        - "dailyForecasts": An array of objects, where each object has "day" (e.g., "Selasa") and "predictedSales" (a number).
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        dailyForecasts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    day: { type: Type.STRING },
                                    predictedSales: { type: Type.NUMBER },
                                },
                                required: ['day', 'predictedSales']
                            }
                        }
                    },
                    required: ['summary', 'dailyForecasts']
                }
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error, 'getSalesForecast');
    }
};


export const createMenuItemWithAi = async (userInput: string, ingredients: Ingredient[]): Promise<GeneratedMenuItem> => {
    try {
        const ingredientsString = ingredients.map(i => `${i.name} (${i.unit})`).join(', ');
        const prompt = `
          You are a creative chef for a modern coffee shop. Based on the user's idea and the available ingredients, create a new menu item.

          User Idea: "${userInput}"

          Available Ingredients: ${ingredientsString}

          Provide a response in a structured JSON format with the following keys: "name", "description", "sellingPrice", and "recipe".
          - "name": A creative and appealing name for the new menu item.
          - "description": A short, enticing description for the menu.
          - "sellingPrice": A recommended selling price (integer) in IDR, considering typical coffee shop pricing.
          - "recipe": An array of objects, where each object has "ingredientName", "quantity" (number), and "unit" (e.g., 'gram', 'ml'). The ingredient names must be chosen from the available ingredients list.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        sellingPrice: { type: Type.NUMBER },
                        recipe: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    ingredientName: { type: Type.STRING },
                                    quantity: { type: Type.NUMBER },
                                    unit: { type: Type.STRING },
                                },
                                required: ['ingredientName', 'quantity', 'unit']
                            }
                        }
                    },
                    required: ['name', 'description', 'sellingPrice', 'recipe']
                }
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error, 'createMenuItemWithAi');
    }
};

export const generateMenuImage = async (menuName: string, description: string): Promise<string> => {
    try {
        const prompt = `Food photography, ${menuName}, ${description}, coffee shop ambiance, delicious, high detail, professional quality`;
        
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '4:3',
            },
        });

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    } catch (error) {
        handleApiError(error, 'generateMenuImage');
    }
};


export const getSalesAnalysis = async (
    salesData: { menuItem: MenuItem; sold: number }[],
    originalIngredients: Ingredient[],
    updatedIngredients: Ingredient[]
): Promise<string> => {
    try {
        const salesString = salesData.map(s => `${s.menuItem.name}: ${s.sold} unit terjual`).join('\n');
        const ingredientChanges = updatedIngredients.map(updatedIng => {
            const originalIng = originalIngredients.find(i => i.id === updatedIng.id);
            if (originalIng && originalIng.stockLevel !== updatedIng.stockLevel) {
                return `${updatedIng.name}: stok berubah dari ${originalIng.stockLevel} menjadi ${updatedIng.stockLevel}`;
            }
            return '';
        }).filter(Boolean).join('\n');

        const prompt = `
          Berikut adalah rekap penjualan harian dan perubahan stok bahan baku setelah penjualan.
          
          Data Penjualan:
          ${salesString}
          
          Perubahan Stok:
          ${ingredientChanges}
          
          Berikan analisis singkat dalam format markdown:
          1.  ### Ringkasan Penjualan: Ringkasan performa penjualan hari ini (item terlaris, dll.).
          2.  ### Status Inventaris: Sorot bahan baku yang stoknya menipis dan perlu perhatian.
          3.  ### Rekomendasi Aksi: Berikan satu rekomendasi strategis singkat (misalnya, "Pertimbangkan promosi untuk Brownies besok" atau "Segera restock Susu UHT").
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        return response.text;
    } catch (error) {
        handleApiError(error, 'getSalesAnalysis');
    }
};

export const getReorderSuggestion = async (
    lowStockIngredients: Ingredient[], 
    allIngredients: Ingredient[], 
    salesHistory: SalesHistoryRecord[], 
    menuItems: MenuItem[], 
    wasteHistory: WasteRecord[],
    forecasts: { itemName: string; forecast: Forecast }[],
    suppliers: Supplier[],
    supplierPrices: SupplierPriceListItem[]
): Promise<ReorderSuggestion> => {
    try {
        const lowStockString = lowStockIngredients.map(i => `${i.name} (stok sisa: ${i.stockLevel} ${i.unit}, titik reorder: ${i.reorderPoint} ${i.unit})`).join('\n');
        const salesString = formatSalesHistory(salesHistory, menuItems, 14);
        const ingredientsWithPrice = allIngredients.map(i => `${i.name}: ${i.price}/${i.unit}`).join('\n');
        const wasteString = formatWasteHistory(wasteHistory, allIngredients, 14);
        const forecastString = formatForecasts(forecasts);
        const supplierString = formatSuppliersWithPrices(suppliers, supplierPrices, allIngredients);

        const prompt = `
        You are a highly intelligent F&B inventory manager. Your goal is to create a smart, proactive reorder suggestion that anticipates future demand and also recommends the best supplier for the order.

        Analyze the following data:

        1.  **Low Stock Ingredients:** These are the items that have hit their reorder point.
            ${lowStockString}

        2.  **Future Sales Forecast (7 days):** This is the most important data for predicting future needs.
            ${forecastString}

        3.  **Recent Sales History (14 days):** A secondary reference for consumption patterns.
            ${salesString}

        4.  **Recent Waste History (14 days):** Use this to be conservative. Reduce order quantity for frequently wasted items.
            ${wasteString}
        
        5.  **Internal Ingredient Prices:** For internal cost estimation.
            ${ingredientsWithPrice}
        
        6.  **Supplier Price Lists:** This data shows which supplier provides which ingredient at what price.
            ${supplierString}

        Your tasks:
        1.  **Generate Purchase List:** Based on the forecast, sales, and waste data, create a purchase list for the low-stock ingredients. Aim for a stock level sufficient for approximately 14 days, adjusted by forecast and waste.
        2.  **Recommend Supplier:** After generating the purchase list, analyze the supplier price lists. Recommend the ONE best supplier for this ENTIRE order. The best supplier is the one who can provide the most items from the list at the best overall value.
        3.  **Provide Justification:** Explain your supplier recommendation. For example, "Kopi Jaya Abadi direkomendasikan karena mereka menawarkan harga terbaik untuk Biji Kopi, yang merupakan item biaya tertinggi dalam pesanan ini."
        4.  **Summarize Logic:** In your main summary, explain your reorder logic, highlighting how the sales forecast and waste data influenced quantities.

        Provide the output in a structured JSON format.
        - "summary": Text summary of your reorder logic.
        - "purchaseList": An array of objects with "ingredientName", "quantityToOrder", "unit", and "estimatedCost".
        - "recommendedSupplier": An object with "supplierId", "supplierName", and "justification" for your supplier choice. This can be null if no suitable supplier is found.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        purchaseList: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    ingredientName: { type: Type.STRING },
                                    quantityToOrder: { type: Type.NUMBER },
                                    unit: { type: Type.STRING },
                                    estimatedCost: { type: Type.NUMBER },
                                },
                                 required: ['ingredientName', 'quantityToOrder', 'unit', 'estimatedCost']
                            }
                        },
                        recommendedSupplier: {
                            type: Type.OBJECT,
                            properties: {
                                supplierId: { type: Type.STRING },
                                supplierName: { type: Type.STRING },
                                justification: { type: Type.STRING },
                            },
                            required: ['supplierId', 'supplierName', 'justification']
                        }
                    },
                    required: ['summary', 'purchaseList']
                }
            }
        });
        
        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error, 'getReorderSuggestion');
    }
};


export const getDynamicPriceSuggestion = async (menuItem: MenuItem): Promise<DynamicPriceSuggestion> => {
    try {
        const prompt = `
            A menu item "${menuItem.name}" has its margin drop to a critical level.
            - Current Selling Price: ${menuItem.sellingPrice}
            - New COGS: ${menuItem.cogs}
            - Current Actual Margin: ${menuItem.actualMargin.toFixed(1)}%
            - Target Margin: ${menuItem.targetMargin}%

            Calculate a new selling price to get the margin as close as possible to the target margin (${menuItem.targetMargin}%). The new price should be a sensible, rounded number suitable for a menu (e.g., ending in 000 or 500).

            Provide a response in a structured JSON format with "newSellingPrice", "justification", and "projectedMargin".
            - "newSellingPrice": The recommended new price (number).
            - "justification": A brief, professional explanation for the price change.
            - "projectedMargin": The new calculated margin percentage (number).
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        newSellingPrice: { type: Type.NUMBER },
                        justification: { type: Type.STRING },
                        projectedMargin: { type: Type.NUMBER },
                    },
                    required: ['newSellingPrice', 'justification', 'projectedMargin']
                }
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error, 'getDynamicPriceSuggestion');
    }
};


export const getProfitLossAnalysis = async (stats: ProfitLossStats): Promise<string> => {
    try {
        const statsString = `
          - Total Revenue: ${stats.totalRevenue}
          - Total COGS: ${stats.totalCogs}
          - Gross Profit: ${stats.grossProfit} (${stats.grossProfitMargin.toFixed(1)}% margin)
          - Total Operational Cost: ${stats.totalOperationalCost}
          - Total Waste Cost: ${stats.totalWasteCost}
          - Net Profit: ${stats.netProfit} (${stats.netProfitMargin.toFixed(1)}% margin)
        `;

        const prompt = `
        Analyze the following profit and loss statement for a coffee shop over the last ${stats.periodDays} days.

        Financial Data:
        ${statsString}

        Provide an analysis in markdown format. Include:
        1.  ### Ringkasan Eksekutif: A brief summary of the overall financial health.
        2.  ### Poin Kuat: Highlight what's going well.
        3.  ### Area untuk Peningkatan: Identify the biggest cost drivers or issues.
        4.  ### Rekomendasi Aksi: Provide 2-3 specific, actionable recommendations to improve profitability.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        return response.text;
    } catch (error) {
        handleApiError(error, 'getProfitLossAnalysis');
    }
};

export const getBasketAnalysis = async (salesHistory: SalesHistoryRecord[], menuItems: MenuItem[]): Promise<BasketAnalysis> => {
    try {
        const menuItemsMap = new Map(menuItems.map(item => [item.id, item]));
        const transactions: Record<string, string[]> = {};
        salesHistory.forEach(sale => {
            if (!transactions[sale.date]) {
                transactions[sale.date] = [];
            }
            const menuItem = menuItemsMap.get(sale.menuItemId);
            if (menuItem) {
              transactions[sale.date].push(menuItem.name);
            }
        });

        const transactionString = Object.values(transactions).map(t => t.join(', ')).slice(0, 100).join('\n');

        const menuItemsWithImages = menuItems.map(i => ({name: i.name, imageUrl: i.imageUrl}));
        
        const prompt = `
        Analyze the following daily sales transactions from a coffee shop to find frequently co-purchased items (basket analysis).

        Transactions (each line represents a day's unique items sold):
        ${transactionString}

        Available menu items with their image URLs:
        ${JSON.stringify(menuItemsWithImages)}

        Identify the top 3 most popular pairs of items bought together.

        Provide the output in a structured JSON format with "summary" and "pairings" keys.
        - "summary": A brief, insightful text summary about customer purchasing behavior.
        - "pairings": An array of the top 3 pairing objects. Each object must have "item1Name", "item2Name", "item1ImageUrl", "item2ImageUrl", and "analysis" (a short, creative reason why they're a good pair). Ensure the image URLs are correct based on the provided menu item list.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        pairings: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    item1Name: { type: Type.STRING },
                                    item2Name: { type: Type.STRING },
                                    item1ImageUrl: { type: Type.STRING },
                                    item2ImageUrl: { type: Type.STRING },
                                    analysis: { type: Type.STRING },
                                },
                                 required: ['item1Name', 'item2Name', 'item1ImageUrl', 'item2ImageUrl', 'analysis']
                            }
                        }
                    },
                    required: ['summary', 'pairings']
                }
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error, 'getBasketAnalysis');
    }
};


export const getMarketingCampaignSuggestion = async (basketAnalysis: BasketAnalysis, profitLossStats: ProfitLossStats): Promise<MarketingCampaignSuggestion> => {
    try {
        const pairing = basketAnalysis.pairings[0];
        if (!pairing) throw new Error("No item pairings found to create a campaign.");

        const prompt = `
            Based on the insight that "${pairing.item1Name}" and "${pairing.item2Name}" are often bought together, and considering the business's current net profit margin of ${profitLossStats.netProfitMargin.toFixed(1)}%, devise a marketing campaign.

            The goal is to boost sales without heavily sacrificing margin.

            Provide a response in a structured JSON format with the following keys: "campaignName", "marketingCopy", "promoMechanic", "justification", and "involvedItems".
            - "campaignName": A catchy name for the campaign.
            - "marketingCopy": Short, appealing text for social media or in-store promotion.
            - "promoMechanic": The specific offer (e.g., "Beli [Item A], dapatkan diskon 50% untuk [Item B]").
            - "justification": A brief explanation of why this campaign is a good idea.
            - "involvedItems": an object with "item1Name" and "item2Name".
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        campaignName: { type: Type.STRING },
                        marketingCopy: { type: Type.STRING },
                        promoMechanic: { type: Type.STRING },
                        justification: { type: Type.STRING },
                        involvedItems: {
                            type: Type.OBJECT,
                            properties: {
                                item1Name: { type: Type.STRING },
                                item2Name: { type: Type.STRING },
                            },
                            required: ['item1Name', 'item2Name']
                        }
                    },
                    required: ['campaignName', 'marketingCopy', 'promoMechanic', 'justification', 'involvedItems']
                }
            }
        });
        
        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error, 'getMarketingCampaignSuggestion');
    }
};

export const getMenuEngineeringAnalysis = async (menuItems: MenuItem[], salesHistory: SalesHistoryRecord[]): Promise<MenuEngineeringAnalysis> => {
    try {
        const salesByItem: Record<string, { quantity: number; revenue: number }> = {};
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const last30DaysStr = last30Days.toISOString().split('T')[0];
        
        salesHistory.filter(s => s.date >= last30DaysStr).forEach(sale => {
            if (!salesByItem[sale.menuItemId]) {
                salesByItem[sale.menuItemId] = { quantity: 0, revenue: 0 };
            }
            salesByItem[sale.menuItemId].quantity += sale.quantitySold;
            salesByItem[sale.menuItemId].revenue += sale.totalRevenue;
        });

        const menuDataForAI = menuItems.map(item => ({
            id: item.id,
            name: item.name,
            imageUrl: item.imageUrl,
            popularity: salesByItem[item.id]?.quantity || 0,
            profitability: item.sellingPrice - item.cogs
        }));

        const prompt = `
            You are a menu engineering expert for a coffee shop. Based on the Boston Consulting Group (BCG) Matrix, analyze the following menu items.
            - Popularity is the total units sold in the last 30 days.
            - Profitability is the gross profit per unit (selling price - cogs).
            
            Data:
            ${JSON.stringify(menuDataForAI, null, 2)}
            
            Classify each item into one of four categories:
            1.  **Star**: High popularity, High profitability.
            2.  **Cash Cow**: High popularity, Low profitability.
            3.  **Question Mark**: Low popularity, High profitability.
            4.  **Dog**: Low popularity, Low profitability.
            
            Provide a response in a structured JSON format with "summary", "recommendation", and "items" keys.
            - "summary": A brief, insightful summary of the overall menu performance based on the matrix.
            - "recommendation": A general strategic recommendation.
            - "items": An array of objects. Each object must have "id", "name", "imageUrl", and "category" ('Star', 'Cash Cow', 'Question Mark', or 'Dog').
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        recommendation: { type: Type.STRING },
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    name: { type: Type.STRING },
                                    imageUrl: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                },
                                required: ['id', 'name', 'imageUrl', 'category']
                            }
                        }
                    },
                    required: ['summary', 'recommendation', 'items']
                }
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error, 'getMenuEngineeringAnalysis');
    }
};

export const getWastePreventionAdvice = async (wasteHistory: WasteRecord[], salesHistory: SalesHistoryRecord[], ingredients: Ingredient[], menuItems: MenuItem[]): Promise<WastePreventionAdvice> => {
    try {
        const wasteString = formatWasteHistory(wasteHistory, ingredients, 30);
        const salesString = formatSalesHistory(salesHistory, menuItems, 30);

        const prompt = `
        You are a proactive F&B operations analyst. Your goal is to identify patterns in waste and sales data to provide actionable advice on preventing future waste.

        Analyze the following data for the last 30 days:

        1.  **Waste History:**
            ${wasteString}

        2.  **Sales History:**
            ${salesString}

        Your Task:
        Identify up to 3 significant patterns of waste. For each pattern, explain the problem, provide a concrete recommendation, name the main ingredient involved, and estimate the potential cost savings over 30 days.

        Provide the output in a structured JSON format.
        - "summary": A brief, high-level summary of the waste situation.
        - "patterns": An array of objects, where each object has:
            - "patternDescription": A clear description of the identified waste pattern (e.g., "Susu UHT consistently wasted on Mondays").
            - "recommendation": An actionable recommendation to prevent this waste (e.g., "Reduce milk stock preparation by 20% on Mondays").
            - "implicatedIngredient": The name of the main ingredient involved.
            - "estimatedCostSaved": An estimated potential saving in IDR for the next 30 days if the recommendation is followed.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        patterns: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    patternDescription: { type: Type.STRING },
                                    recommendation: { type: Type.STRING },
                                    implicatedIngredient: { type: Type.STRING },
                                    estimatedCostSaved: { type: Type.NUMBER },
                                },
                                required: ['patternDescription', 'recommendation', 'implicatedIngredient', 'estimatedCostSaved']
                            }
                        }
                    },
                    required: ['summary', 'patterns']
                }
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        handleApiError(error, 'getWastePreventionAdvice');
    }
};

export const getCompetitorAnalysis = async (menuItemName: string, location: string): Promise<CompetitorAnalysis> => {
    try {
        const prompt = `Lakukan analisis kompetitor untuk item menu "${menuItemName}" di area ${location}. Fokus pada:
        1.  **Harga:** Berapa harga rata-rata, termurah, dan termahal untuk menu serupa di lokasi tersebut?
        2.  **Sentimen Pelanggan:** Apa kata ulasan pelanggan online? Apakah ada keluhan umum atau pujian (misalnya, terlalu manis, kopinya kuat, tempatnya nyaman)?
        3.  **Diferensiasi:** Apa yang membuat menu kompetitor menonjol? (misalnya, menggunakan bahan premium, ukuran lebih besar, topping unik).
        
        Berikan jawaban dalam format markdown yang ringkas dan mudah dibaca.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks.map((chunk: any) => chunk.web).filter(Boolean);
        
        return {
            analysisText: response.text,
            sources: sources
        };

    } catch (error) {
        handleApiError(error, 'getCompetitorAnalysis');
    }
};


// Chat functionality
export const startAiChat = async (menuItems: MenuItem[], ingredients: Ingredient[], salesHistory: SalesHistoryRecord[], operationalCosts: OperationalCost[]) => {
    try {
        const context = `
            You are ProfitLens AI, an expert business analyst and guide for a coffee shop owner using this application.
            Your main role is to help the user understand their business data and how to use the ProfitLens AI application's features.

            **Application Features Guide:**
            If the user asks about a feature, explain it clearly based on this guide.

            *   **Dashboard:** The main control center showing a real-time overview of business health (Revenue, Profit, Margin). It includes a sales chart, margin alerts, and AI-powered growth opportunities.
            *   **Laba & Rugi (Profit & Loss):** Automatically calculates the profit and loss statement by breaking down all costs (COGS, operational, waste) to show the net profit. It also offers AI financial analysis.
            *   **Analisis Performa (Performance Analysis):** Provides deep strategic insights. Includes AI Menu Engineering (Stars, Dogs, etc.), Basket Analysis (what items sell together), and Market Intelligence (competitor pricing research via Google Search).
            *   **Inventaris (Inventory):** For real-time raw material tracking. It shows low-stock items and provides AI-driven reorder suggestions to prevent stockouts. Also manages Purchase Orders.
            *   **Supplier:** A directory to manage supplier contacts and their price lists for different ingredients.
            *   **Buangan (Waste):** A feature to log discarded ingredients. The AI analyzes these logs to find patterns and recommend ways to reduce waste and save money.
            *   **Menu:** The place to manage all menu items, including recipes, prices, and real-time profit margins. Includes an AI feature to generate new, creative menu ideas.
            *   **Operasional (Operational):** For tracking all non-ingredient business costs like salaries, rent, and utilities, which is essential for accurate P&L reports.
            *   **Proyeksi (Forecasting):** Uses AI to predict future sales for any menu item, helping with inventory and staff planning.
            *   **Rekap Penjualan (Sales Summary):** Where daily sales figures are entered. This action automatically updates inventory and sales history, which fuels all AI analyses.
            *   **Profil & Pengaturan (Profile & Settings):** Used for managing the user profile and business outlets (adding, editing, or removing them).

            **Current Business Data Context:**
            Below is the current data for the user's selected outlet. Use this to answer specific questions about their business.
            
            Menu:
            ${formatMenuItems(menuItems)}

            Inventory:
            ${formatIngredients(ingredients)}
            
            Operational Costs:
            ${operationalCosts.map(c => `- ${c.name}: ${c.amount} per ${c.interval}`).join('\n')}

            Recent Sales (last 7 days):
            ${formatSalesHistory(salesHistory, menuItems, 7)}
        `;

        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: context,
            }
        });
    } catch (error) {
        handleApiError(error, 'startAiChat');
    }
};

export const sendMessageToAiChatStream = async (message: string) => {
    if (!chat) {
        throw new Error("Chat not initialized. Call startAiChat first.");
    }
    return chat.sendMessageStream({ message });
};