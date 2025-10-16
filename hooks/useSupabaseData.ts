import { useState, useEffect, useMemo, useCallback } from 'react';
import { DatabaseService } from '../services/databaseService';
import type { MenuItem, Ingredient, SalesHistoryRecord, DetailedPerformanceStats, PerformanceItem, OperationalCost, WasteRecord, ProfitLossStats, Supplier, SupplierPriceListItem, PendingOrder, ActiveCampaign, MarketingCampaignSuggestion, Outlet, Notification, View, User, RecipeComponent } from '../types';
import { MarginStatus, WasteReason } from '../types';

export const useSupabaseData = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [currentOutletId, setCurrentOutletId] = useState<string>('');
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [menuItemsData, setMenuItemsData] = useState<Omit<MenuItem, 'cogs' | 'actualMargin' | 'marginStatus'>[]>([]);
  const [recipes, setRecipes] = useState<{ menuItemId: string; ingredientId: string; quantity: number }[]>([]);
  const [allSalesHistory, setAllSalesHistory] = useState<SalesHistoryRecord[]>([]);
  const [allOperationalCosts, setAllOperationalCosts] = useState<OperationalCost[]>([]);
  const [allWasteHistory, setAllWasteHistory] = useState<WasteRecord[]>([]);
  const [allPendingOrders, setAllPendingOrders] = useState<PendingOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierPrices, setSupplierPrices] = useState<SupplierPriceListItem[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [isComparing, setIsComparing] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        outletsData,
        ingredientsData,
        menuData,
        recipesData,
        salesData,
        costsData,
        wasteData,
        ordersData,
        suppliersData,
        pricesData,
        campaignData,
      ] = await Promise.all([
        DatabaseService.getOutlets(),
        DatabaseService.getIngredients(),
        DatabaseService.getMenuItems(),
        DatabaseService.getRecipes(),
        DatabaseService.getSalesHistory(),
        DatabaseService.getOperationalCosts(),
        DatabaseService.getWasteRecords(),
        DatabaseService.getPendingOrders(),
        DatabaseService.getSuppliers(),
        DatabaseService.getSupplierPrices(),
        DatabaseService.getActiveCampaign(),
      ]);

      setOutlets(outletsData);
      if (outletsData.length > 0 && !currentOutletId) {
        setCurrentOutletId(outletsData[0].id);
      }
      setAllIngredients(ingredientsData);
      setMenuItemsData(menuData);
      setRecipes(recipesData);
      setAllSalesHistory(salesData);
      setAllOperationalCosts(costsData);
      setAllWasteHistory(wasteData);
      setAllPendingOrders(ordersData);
      setSuppliers(suppliersData);
      setSupplierPrices(pricesData);
      setActiveCampaign(campaignData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOutletId]);

  useEffect(() => {
    loadAllData();
  }, []);

  const ingredients = useMemo(() => allIngredients.filter(i => i.outletId === currentOutletId), [allIngredients, currentOutletId]);
  const salesHistory = useMemo(() => allSalesHistory.filter(s => s.outletId === currentOutletId), [allSalesHistory, currentOutletId]);
  const operationalCosts = useMemo(() => allOperationalCosts.filter(c => c.outletId === currentOutletId), [allOperationalCosts, currentOutletId]);
  const wasteHistory = useMemo(() => allWasteHistory.filter(w => w.outletId === currentOutletId), [allWasteHistory, currentOutletId]);
  const pendingOrders = useMemo(() => allPendingOrders.filter(p => p.outletId === currentOutletId), [allPendingOrders, currentOutletId]);

  const toggleComparison = useCallback(() => setIsComparing(prev => !prev), []);

  const menuItems = useMemo<MenuItem[]>(() => {
    const ingredientsMap = new Map(ingredients.map(i => [i.id, i]));

    return menuItemsData.map(item => {
      const itemRecipes = recipes.filter(r => r.menuItemId === item.id);
      const recipe: RecipeComponent[] = itemRecipes.map(r => ({
        ingredientId: r.ingredientId,
        quantity: r.quantity,
      }));

      const cogs = recipe.reduce((total, component) => {
        const ingredient = ingredientsMap.get(component.ingredientId);
        return total + (ingredient ? ingredient.price * component.quantity : 0);
      }, 0);

      const actualMargin = item.sellingPrice > 0 ? ((item.sellingPrice - cogs) / item.sellingPrice) * 100 : 0;

      let marginStatus = MarginStatus.Safe;
      const marginDifference = actualMargin - item.targetMargin;
      if (marginDifference < 0 && marginDifference >= -10) {
        marginStatus = MarginStatus.Warning;
      } else if (marginDifference < -10) {
        marginStatus = MarginStatus.Danger;
      }

      return { ...item, recipe, cogs, actualMargin, marginStatus };
    });
  }, [ingredients, menuItemsData, recipes]);

  const getMenuItemById = useCallback((id: string | null): (MenuItem & { ingredients: (Ingredient & { quantity: number })[] }) | null => {
    if (!id) return null;
    const menuItem = menuItems.find(item => item.id === id);
    if (!menuItem) return null;

    const ingredientsMap = new Map(ingredients.map(i => [i.id, i]));
    const populatedIngredients = menuItem.recipe
      .map(component => {
        const ingredient = ingredientsMap.get(component.ingredientId);
        return ingredient ? { ...ingredient, quantity: component.quantity } : null;
      })
      .filter((i): i is Ingredient & { quantity: number } => i !== null);

    return { ...menuItem, ingredients: populatedIngredients };
  }, [menuItems, ingredients]);

  const salesHistoryForRange = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);
    return salesHistory.filter(record => new Date(record.date) >= cutoffDate);
  }, [salesHistory, dateRange]);

  const dashboardStats = useMemo(() => {
    const totalRevenue = salesHistoryForRange.reduce((sum, record) => sum + record.totalRevenue, 0);
    const { netProfit } = calculateProfitLoss(dateRange, salesHistory, menuItems, operationalCosts, wasteHistory);
    const lowStockCount = ingredients.filter(ing => ing.stockLevel <= ing.reorderPoint).length;
    const totalItemsSold = salesHistoryForRange.reduce((sum, record) => sum + record.quantitySold, 0);
    const averageMargin = menuItems.length > 0 ? menuItems.reduce((sum, item) => sum + item.actualMargin, 0) / menuItems.length : 0;
    return { totalRevenue, netProfit, lowStockCount, totalItemsSold, averageMargin };
  }, [salesHistoryForRange, menuItems, ingredients, operationalCosts, wasteHistory, dateRange, salesHistory]);

  const chartData = useMemo(() => {
    const data: { [date: string]: number } = {};
    const labels: string[] = [];
    for (let i = dateRange - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      labels.push(dateString);
      data[dateString] = 0;
    }
    salesHistoryForRange.forEach(record => {
      if (data[record.date] !== undefined) {
        data[record.date] += record.totalRevenue;
      }
    });
    return { labels: labels, data: Object.values(data) };
  }, [salesHistoryForRange, dateRange]);

  const comparisonChartData = useMemo(() => {
    const data: { [date: string]: number } = {};

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - dateRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (dateRange * 2));

    const salesForComparisonRange = salesHistory.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate < endDate;
    });

    for (let i = dateRange - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - dateRange - i);
      const dateString = date.toISOString().split('T')[0];
      data[dateString] = 0;
    }

    salesForComparisonRange.forEach(record => {
      if (data[record.date] !== undefined) {
        data[record.date] += record.totalRevenue;
      }
    });

    return { data: Object.values(data) };
  }, [salesHistory, dateRange]);

  const inventoryOverviewStats = useMemo(() => {
    const totalItems = ingredients.length;
    const lowStockCount = ingredients.filter(ing => ing.stockLevel <= ing.reorderPoint).length;
    const totalStockValue = ingredients.reduce((sum, ing) => sum + (ing.price * ing.stockLevel), 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const totalWasteCostLast30Days = wasteHistory
      .filter(w => new Date(w.date) >= thirtyDaysAgo)
      .reduce((sum, w) => sum + w.cost, 0);
    return { totalItems, lowStockCount, totalStockValue, totalWasteCostLast30Days };
  }, [ingredients, wasteHistory]);

  const ingredientsWithWasteCost = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const wasteCostMap = new Map<string, number>();
    wasteHistory
      .filter(w => new Date(w.date) >= thirtyDaysAgo)
      .forEach(w => {
        wasteCostMap.set(w.ingredientId, (wasteCostMap.get(w.ingredientId) || 0) + w.cost);
      });
    return ingredients.map(ing => ({
      ...ing,
      wasteCostLast30Days: wasteCostMap.get(ing.id) || 0,
    }));
  }, [ingredients, wasteHistory]);

  const marginAlerts = useMemo(() => {
    const alerts: { ingredientName: string; priceIncreasePercent: number; affectedMenus: string[] }[] = [];
    const ingredientsMap = new Map(ingredients.map(i => [i.id, i]));

    ingredients.forEach(ing => {
      if (ing.previousPrice && ing.price > ing.previousPrice) {
        const priceIncreasePercent = ((ing.price - ing.previousPrice) / ing.previousPrice) * 100;
        if (priceIncreasePercent > 10) {
          const affectedMenus = menuItems
            .filter(m => m.recipe.some(r => r.ingredientId === ing.id))
            .map(m => m.name);
          if (affectedMenus.length > 0) {
            alerts.push({
              ingredientName: ing.name,
              priceIncreasePercent: Math.round(priceIncreasePercent),
              affectedMenus
            });
          }
        }
      }
    });
    return alerts;
  }, [ingredients, menuItems]);

  const detailedPerformanceStats = useMemo<DetailedPerformanceStats>(() => {
    const salesStats: Record<string, { units: number; revenue: number }> = {};
    menuItems.forEach(item => { salesStats[item.id] = { units: 0, revenue: 0 }; });
    salesHistoryForRange.forEach(record => {
      if (salesStats[record.menuItemId]) {
        salesStats[record.menuItemId].units += record.quantitySold;
        salesStats[record.menuItemId].revenue += record.totalRevenue;
      }
    });
    const performanceItems = menuItems.map(item => ({
      ...item,
      unitsSold: salesStats[item.id].units,
      revenue: salesStats[item.id].revenue
    }));
    const createPerformanceList = (
      items: typeof performanceItems,
      metricKey: 'unitsSold' | 'revenue' | 'actualMargin',
      sort: 'asc' | 'desc'
    ): PerformanceItem[] => {
      return items.sort((a, b) => sort === 'desc' ? b[metricKey] - a[metricKey] : a[metricKey] - b[metricKey]).slice(0, 3).map(item => ({ id: item.id, name: item.name, imageUrl: item.imageUrl, metric: item[metricKey] }));
    };
    return {
      bestSellersByUnit: createPerformanceList(performanceItems, 'unitsSold', 'desc'),
      highestRevenueItems: createPerformanceList(performanceItems, 'revenue', 'desc'),
      mostProfitableItems: createPerformanceList(performanceItems, 'actualMargin', 'desc'),
      leastProfitableItems: createPerformanceList(performanceItems, 'actualMargin', 'asc'),
    };
  }, [menuItems, salesHistoryForRange]);

  const wasteSummary = useMemo(() => {
    const wasteByReason: Record<string, number> = {};
    Object.values(WasteReason).forEach(r => wasteByReason[r] = 0);
    wasteHistory.forEach(record => { wasteByReason[record.reason] = (wasteByReason[record.reason] || 0) + record.cost; });
    return { labels: Object.keys(wasteByReason), data: Object.values(wasteByReason) };
  }, [wasteHistory]);

  const profitLossStats = useMemo<ProfitLossStats>(() => {
    return calculateProfitLoss(dateRange, salesHistory, menuItems, operationalCosts, wasteHistory);
  }, [dateRange, salesHistory, menuItems, operationalCosts, wasteHistory]);

  const campaignPerformance = useMemo(() => {
    if (!activeCampaign) return null;
    const startDate = new Date(activeCampaign.startDate);
    const now = new Date();
    const daysRunning = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const involvedItemsMap = new Map<string, boolean>();
    involvedItemsMap.set(activeCampaign.involvedItems.item1Name, true);
    involvedItemsMap.set(activeCampaign.involvedItems.item2Name, true);
    const involvedItemIds = new Set(menuItems.filter(m => involvedItemsMap.has(m.name)).map(m => m.id));
    const salesDuringCampaign = allSalesHistory.filter(s => new Date(s.date) >= startDate && involvedItemIds.has(s.menuItemId));
    const totalUnitsDuring = salesDuringCampaign.reduce((sum, s) => sum + s.quantitySold, 0);
    const avgDailyUnitsDuring = totalUnitsDuring / (daysRunning || 1);
    const beforeStartDate = new Date(startDate);
    beforeStartDate.setDate(beforeStartDate.getDate() - daysRunning);
    const salesBeforeCampaign = allSalesHistory.filter(s => { const d = new Date(s.date); return d >= beforeStartDate && d < startDate && involvedItemIds.has(s.menuItemId); });
    const totalUnitsBefore = salesBeforeCampaign.reduce((sum, s) => sum + s.quantitySold, 0);
    const avgDailyUnitsBefore = totalUnitsBefore / (daysRunning || 1);
    let percentageChange = 0;
    if (avgDailyUnitsBefore > 0) { percentageChange = ((avgDailyUnitsDuring - avgDailyUnitsBefore) / avgDailyUnitsBefore) * 100; }
    else if (avgDailyUnitsDuring > 0) { percentageChange = 100; }
    return { daysRunning, percentageChange };
  }, [activeCampaign, menuItems, allSalesHistory]);

  const notifications = useMemo<Notification[]>(() => {
    const allNotifications: Omit<Notification, 'isRead'>[] = [];

    ingredients.forEach(ing => {
      if (ing.stockLevel <= ing.reorderPoint) {
        allNotifications.push({
          id: `lowstock-${ing.id}`,
          type: 'low_stock',
          message: `Stok untuk ${ing.name} menipis (${ing.stockLevel} ${ing.unit}). Segera lakukan pemesanan ulang.`,
          timestamp: new Date().toISOString(),
          relatedView: 'inventory',
          relatedViewProps: { filter: 'low_stock' },
        });
      }
    });

    marginAlerts.forEach((alert, index) => {
      allNotifications.push({
        id: `margin-${alert.ingredientName}-${index}`,
        type: 'margin_alert',
        message: `Harga ${alert.ingredientName} naik ${alert.priceIncreasePercent}%, mempengaruhi margin ${alert.affectedMenus.join(', ')}.`,
        timestamp: new Date().toISOString(),
        relatedView: 'dashboard'
      });
    });

    return allNotifications.map(n => ({...n, isRead: readNotifications.includes(n.id) })).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [ingredients, marginAlerts, readNotifications]);

  const markNotificationsAsRead = useCallback((ids: string[]) => {
    setReadNotifications(prev => [...new Set([...prev, ...ids])]);
  }, []);

  const addIngredient = useCallback(async (newIngredient: Omit<Ingredient, 'id' | 'outletId'>) => {
    const ingredient = await DatabaseService.addIngredient({ ...newIngredient, outletId: currentOutletId });
    setAllIngredients(prev => [...prev, ingredient]);
    return ingredient;
  }, [currentOutletId]);

  const addMenuItem = useCallback(async (newItem: Omit<MenuItem, 'id' | 'cogs' | 'actualMargin' | 'marginStatus'>) => {
    const recipeIngredients = newItem.recipe.map(r => ({ ingredientId: r.ingredientId, quantity: r.quantity }));
    const id = await DatabaseService.addMenuItem(newItem, recipeIngredients);
    await loadAllData();
    return { ...newItem, id };
  }, [loadAllData]);

  const updateIngredientPrices = useCallback(async (updatedPrices: Record<string, number>) => {
    for (const [id, price] of Object.entries(updatedPrices)) {
      const ingredient = allIngredients.find(i => i.id === id);
      if (ingredient && ingredient.outletId === currentOutletId) {
        await DatabaseService.updateIngredient(id, { previousPrice: ingredient.price, price });
      }
    }
    await loadAllData();
  }, [allIngredients, currentOutletId, loadAllData]);

  const updateIngredientPrice = useCallback(async (id: string, newPrice: number) => {
    const ingredient = allIngredients.find(i => i.id === id);
    if (ingredient) {
      await DatabaseService.updateIngredient(id, { previousPrice: ingredient.price, price: newPrice });
      await loadAllData();
    }
  }, [allIngredients, loadAllData]);

  const updateIngredientStock = useCallback(async (id: string, newStock: number) => {
    await DatabaseService.updateIngredient(id, { stockLevel: newStock });
    await loadAllData();
  }, [loadAllData]);

  const updateIngredientUnit = useCallback(async (id: string, newUnit: string) => {
    await DatabaseService.updateIngredient(id, { unit: newUnit });
    await loadAllData();
  }, [loadAllData]);

  const deleteIngredient = useCallback(async (id: string) => {
    const isUsedInRecipe = recipes.some(r => r.ingredientId === id);
    if (isUsedInRecipe) {
      return { success: false, message: 'Bahan ini masih digunakan dalam resep. Hapus dari resep terlebih dahulu.' };
    }
    await DatabaseService.deleteIngredient(id);
    await loadAllData();
    return { success: true };
  }, [recipes, loadAllData]);

  const updateMenuItem = useCallback(async (updatedItem: Omit<MenuItem, 'cogs' | 'actualMargin' | 'marginStatus'> & {id: string}) => {
    const recipeIngredients = updatedItem.recipe.map(r => ({ ingredientId: r.ingredientId, quantity: r.quantity }));
    await DatabaseService.updateMenuItem(updatedItem.id, updatedItem, recipeIngredients);
    await loadAllData();
  }, [loadAllData]);

  const updateMenuItemPrice = useCallback(async (id: string, newPrice: number) => {
    await DatabaseService.updateMenuItem(id, { sellingPrice: newPrice });
    await loadAllData();
  }, [loadAllData]);

  const deleteMenuItem = useCallback(async (id: string) => {
    await DatabaseService.deleteMenuItem(id);
    await loadAllData();
  }, [loadAllData]);

  const addOperationalCost = useCallback(async (cost: Omit<OperationalCost, 'id' | 'outletId'>) => {
    await DatabaseService.addOperationalCost({ ...cost, outletId: currentOutletId });
    await loadAllData();
  }, [currentOutletId, loadAllData]);

  const updateOperationalCost = useCallback(async (cost: OperationalCost) => {
    await DatabaseService.updateOperationalCost(cost);
    await loadAllData();
  }, [loadAllData]);

  const deleteOperationalCost = useCallback(async (id: string) => {
    await DatabaseService.deleteOperationalCost(id);
    await loadAllData();
  }, [loadAllData]);

  const addWasteRecord = useCallback(async (record: Omit<WasteRecord, 'id' | 'cost' | 'outletId'>) => {
    const ingredient = ingredients.find(i => i.id === record.ingredientId);
    if (!ingredient) return;

    const cost = ingredient.price * record.quantity;
    await DatabaseService.addWasteRecord({ ...record, cost, outletId: currentOutletId });
    await DatabaseService.updateIngredient(record.ingredientId, { stockLevel: Math.max(0, ingredient.stockLevel - record.quantity) });
    await loadAllData();
  }, [ingredients, currentOutletId, loadAllData]);

  const deleteWasteRecord = useCallback(async (id: string) => {
    await DatabaseService.deleteWasteRecord(id);
    await loadAllData();
  }, [loadAllData]);

  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id'>) => {
    await DatabaseService.addSupplier(supplier);
    await loadAllData();
  }, [loadAllData]);

  const updateSupplier = useCallback(async (supplier: Supplier) => {
    await DatabaseService.updateSupplier(supplier);
    await loadAllData();
  }, [loadAllData]);

  const deleteSupplier = useCallback(async (id: string) => {
    await DatabaseService.deleteSupplier(id);
    await loadAllData();
  }, [loadAllData]);

  const linkIngredientToSupplier = useCallback(async (supplierId: string, ingredientId: string, price: number) => {
    await DatabaseService.addSupplierPrice(supplierId, ingredientId, price);
    await loadAllData();
  }, [loadAllData]);

  const updateSupplierIngredientPrice = useCallback(async (linkId: string, newPrice: number) => {
    await DatabaseService.updateSupplierPrice(linkId, newPrice);
    await loadAllData();
  }, [loadAllData]);

  const unlinkIngredientFromSupplier = useCallback(async (linkId: string) => {
    await DatabaseService.deleteSupplierPrice(linkId);
    await loadAllData();
  }, [loadAllData]);

  const addPendingOrder = useCallback(async (order: Omit<PendingOrder, 'id' | 'poNumber' | 'orderDate' | 'outletId'>) => {
    await DatabaseService.addPendingOrder({ ...order, outletId: currentOutletId });
    await loadAllData();
  }, [currentOutletId, loadAllData]);

  const receiveStock = useCallback(async (orderId: string) => {
    const order = pendingOrders.find(o => o.id === orderId);
    if (!order) return;

    const updatedStockMap = new Map<string, number>();
    order.items.forEach(item => {
      updatedStockMap.set(item.ingredientId, (updatedStockMap.get(item.ingredientId) || 0) + item.quantityToOrder);
    });

    for (const [ingredientId, additionalStock] of updatedStockMap.entries()) {
      const ingredient = allIngredients.find(i => i.id === ingredientId);
      if (ingredient) {
        await DatabaseService.updateIngredient(ingredientId, { stockLevel: ingredient.stockLevel + additionalStock });
      }
    }

    await DatabaseService.deletePendingOrder(orderId);
    await loadAllData();
  }, [pendingOrders, allIngredients, loadAllData]);

  const launchCampaign = useCallback(async (campaign: MarketingCampaignSuggestion) => {
    await DatabaseService.launchCampaign(campaign);
    await loadAllData();
  }, [loadAllData]);

  const endCampaign = useCallback(async () => {
    await DatabaseService.endCampaign();
    await loadAllData();
  }, [loadAllData]);

  const processDailySales = useCallback(async (sales: Record<string, number>) => {
    const today = new Date().toISOString().split('T')[0];
    const currentOutletIngredients = ingredients;

    const ingredientsToUpdate = new Map<string, number>();

    for (const menuItem of menuItems) {
      const soldCount = sales[menuItem.id] || 0;
      if (soldCount > 0) {
        await DatabaseService.addSalesRecord({
          date: today,
          menuItemId: menuItem.id,
          quantitySold: soldCount,
          totalRevenue: soldCount * menuItem.sellingPrice,
          outletId: currentOutletId,
        });

        menuItem.recipe.forEach(component => {
          const outletIngredient = currentOutletIngredients.find(i => i.id === component.ingredientId);
          if (outletIngredient) {
            const currentConsumption = ingredientsToUpdate.get(outletIngredient.id) || 0;
            ingredientsToUpdate.set(outletIngredient.id, currentConsumption + (component.quantity * soldCount));
          }
        });
      }
    }

    for (const [ingredientId, consumption] of ingredientsToUpdate.entries()) {
      const ingredient = ingredients.find(i => i.id === ingredientId);
      if (ingredient) {
        await DatabaseService.updateIngredient(ingredientId, { stockLevel: Math.max(0, ingredient.stockLevel - consumption) });
      }
    }

    await loadAllData();
    return ingredients;
  }, [ingredients, menuItems, currentOutletId, loadAllData]);

  const checkStockAvailability = useCallback((sales: Record<string, number>) => {
    const requiredIngredients = new Map<string, number>();
    const stockMap = new Map(ingredients.map(i => [i.id, i.stockLevel]));

    menuItems.forEach(menuItem => {
      const soldCount = sales[menuItem.id] || 0;
      if (soldCount > 0) {
        menuItem.recipe.forEach(component => {
          const currentRequired = requiredIngredients.get(component.ingredientId) || 0;
          requiredIngredients.set(component.ingredientId, currentRequired + component.quantity * soldCount);
        });
      }
    });

    const warnings: Record<string, string> = {};
    menuItems.forEach(menuItem => {
      const soldCount = sales[menuItem.id] || 0;
      if (soldCount > 0) {
        const insufficient = menuItem.recipe.find(component => {
          const needed = requiredIngredients.get(component.ingredientId) || 0;
          const available = stockMap.get(component.ingredientId) || 0;
          return needed > available;
        });
        if (insufficient) {
          const ingredient = ingredients.find(i => i.id === insufficient.ingredientId);
          if (ingredient) {
            warnings[menuItem.id] = `Stok ${ingredient.name} mungkin tidak cukup untuk memenuhi penjualan.`;
          }
        }
      }
    });
    return warnings;
  }, [ingredients, menuItems]);

  const addOutlet = useCallback(async (name: string) => {
    if (!name.trim()) return;
    await DatabaseService.addOutlet(name.trim());
    await loadAllData();
  }, [loadAllData]);

  const updateOutlet = useCallback(async (id: string, name: string) => {
    if (!name.trim()) return;
    await DatabaseService.updateOutlet(id, name.trim());
    await loadAllData();
  }, [loadAllData]);

  const deleteOutlet = useCallback(async (id: string) => {
    if (outlets.length <= 1) {
      return { success: false, message: "Tidak dapat menghapus satu-satunya cabang." };
    }
    if (id === currentOutletId) {
      return { success: false, message: "Tidak dapat menghapus cabang yang sedang aktif. Silakan pindah ke cabang lain terlebih dahulu." };
    }
    const hasData = allIngredients.some(i => i.outletId === id) ||
                    allSalesHistory.some(s => s.outletId === id) ||
                    allOperationalCosts.some(o => o.outletId === id);
    if (hasData) {
      return { success: false, message: "Cabang ini memiliki data terkait (inventaris, penjualan, dll.) dan tidak dapat dihapus." };
    }
    await DatabaseService.deleteOutlet(id);
    await loadAllData();
    return { success: true };
  }, [outlets, currentOutletId, allIngredients, allSalesHistory, allOperationalCosts, loadAllData]);

  const updateUser = useCallback(async (updatedUser: Omit<User, 'avatarUrl'>) => {
    setUser(prev => prev ? { ...prev, ...updatedUser } : null);
  }, []);

  const getAllIngredients = useCallback(() => allIngredients, [allIngredients]);
  const getMenuItems = useCallback(() => menuItemsData, [menuItemsData]);
  const getAllSalesHistory = useCallback(() => allSalesHistory, [allSalesHistory]);
  const getAllOperationalCosts = useCallback(() => allOperationalCosts, [allOperationalCosts]);
  const getAllWasteHistory = useCallback(() => allWasteHistory, [allWasteHistory]);
  const getAllPendingOrders = useCallback(() => allPendingOrders, [allPendingOrders]);
  const getIngredients = useCallback((outletId: string) => allIngredients.filter(i => i.outletId === outletId), [allIngredients]);
  const getSalesHistory = useCallback((outletId: string) => allSalesHistory.filter(s => s.outletId === outletId), [allSalesHistory]);
  const getOperationalCosts = useCallback((outletId: string) => allOperationalCosts.filter(c => c.outletId === outletId), [allOperationalCosts]);
  const getWasteHistory = useCallback((outletId: string) => allWasteHistory.filter(w => w.outletId === outletId), [allWasteHistory]);
  const getPendingOrders = useCallback((outletId: string) => allPendingOrders.filter(p => p.outletId === outletId), [allPendingOrders]);
  const getSuppliers = useCallback(() => suppliers, [suppliers]);
  const getSupplierPrices = useCallback(() => supplierPrices, [supplierPrices]);
  const getActiveCampaign = useCallback(() => activeCampaign, [activeCampaign]);
  const getOutlets = useCallback(() => outlets, [outlets]);
  const getUser = useCallback(() => user, [user]);
  const getCurrentOutletId = useCallback(() => currentOutletId, [currentOutletId]);

  return {
    loading,
    ingredients: ingredientsWithWasteCost,
    menuItems,
    menuItemsData,
    salesHistory,
    operationalCosts,
    wasteHistory,
    suppliers,
    supplierPrices,
    pendingOrders,
    activeCampaign,
    outlets,
    user,
    currentOutletId,
    getMenuItemById,
    dashboardStats,
    chartData,
    comparisonChartData,
    inventoryOverviewStats,
    marginAlerts,
    detailedPerformanceStats,
    wasteSummary,
    profitLossStats,
    campaignPerformance,
    notifications,
    markNotificationsAsRead,
    dateRange,
    setDateRange,
    isComparing,
    toggleComparison,
    setCurrentOutletId,
    addIngredient,
    addMenuItem,
    updateIngredientPrices,
    updateIngredientPrice,
    updateIngredientStock,
    updateIngredientUnit,
    deleteIngredient,
    updateMenuItem,
    updateMenuItemPrice,
    deleteMenuItem,
    addOperationalCost,
    updateOperationalCost,
    deleteOperationalCost,
    addWasteRecord,
    deleteWasteRecord,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    linkIngredientToSupplier,
    updateSupplierIngredientPrice,
    unlinkIngredientFromSupplier,
    addPendingOrder,
    receiveStock,
    launchCampaign,
    endCampaign,
    processDailySales,
    checkStockAvailability,
    addOutlet,
    updateOutlet,
    deleteOutlet,
    updateUser,
    getAllIngredients,
    getMenuItems,
    getAllSalesHistory,
    getAllOperationalCosts,
    getAllWasteHistory,
    getAllPendingOrders,
    getIngredients,
    getSalesHistory,
    getOperationalCosts,
    getWasteHistory,
    getPendingOrders,
    getSuppliers,
    getSupplierPrices,
    getActiveCampaign,
    getOutlets,
    getUser,
    getCurrentOutletId,
  };
};

const calculateProfitLoss = ( periodDays: number, salesHistory: SalesHistoryRecord[], menuItems: MenuItem[], operationalCosts: OperationalCost[], wasteHistory: WasteRecord[]): ProfitLossStats => {
  const menuItemsMap = new Map(menuItems.map(item => [item.id, item]));
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);
  const relevantSales = salesHistory.filter(r => new Date(r.date) >= cutoffDate);
  const relevantWaste = wasteHistory.filter(r => new Date(r.date) >= cutoffDate);
  let totalRevenue = 0;
  let totalCogs = 0;
  relevantSales.forEach(sale => {
    const menuItem = menuItemsMap.get(sale.menuItemId);
    if (menuItem) {
      totalRevenue += sale.totalRevenue;
      totalCogs += menuItem.cogs * sale.quantitySold;
    }
  });
  const totalOperationalCost = operationalCosts.reduce((sum, cost) => {
    const dailyCost = cost.interval === 'monthly' ? cost.amount / 30 : cost.amount;
    return sum + (dailyCost * periodDays);
  }, 0);
  const totalWasteCost = relevantWaste.reduce((sum, record) => sum + record.cost, 0);
  const grossProfit = totalRevenue - totalCogs;
  const netProfit = grossProfit - totalOperationalCost - totalWasteCost;
  const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  return { periodDays, totalRevenue, totalCogs, grossProfit, totalOperationalCost, totalWasteCost, netProfit, grossProfitMargin, netProfitMargin };
};
