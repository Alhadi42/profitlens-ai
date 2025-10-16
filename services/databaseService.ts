import { supabase } from '../lib/supabase';
import type {
  Outlet,
  Ingredient,
  MenuItem,
  RecipeComponent,
  SalesHistoryRecord,
  OperationalCost,
  WasteRecord,
  Supplier,
  SupplierPriceListItem,
  PendingOrder,
  ActiveCampaign,
  MarketingCampaignSuggestion,
  User,
} from '../types';

export class DatabaseService {
  static async getOutlets(): Promise<Outlet[]> {
    const { data, error } = await supabase
      .from('outlets')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async addOutlet(name: string): Promise<Outlet> {
    const { data, error } = await supabase
      .from('outlets')
      .insert({ name })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateOutlet(id: string, name: string): Promise<Outlet> {
    const { data, error } = await supabase
      .from('outlets')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteOutlet(id: string): Promise<void> {
    const { error } = await supabase
      .from('outlets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getIngredients(outletId?: string): Promise<Ingredient[]> {
    let query = supabase.from('ingredients').select('*');

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      price: parseFloat(item.price),
      previousPrice: item.previous_price ? parseFloat(item.previous_price) : undefined,
      stockLevel: parseFloat(item.stock_level),
      reorderPoint: parseFloat(item.reorder_point),
      outletId: item.outlet_id,
    }));
  }

  static async addIngredient(ingredient: Omit<Ingredient, 'id'>): Promise<Ingredient> {
    const { data, error } = await supabase
      .from('ingredients')
      .insert({
        outlet_id: ingredient.outletId,
        name: ingredient.name,
        unit: ingredient.unit,
        price: ingredient.price,
        previous_price: ingredient.previousPrice,
        stock_level: ingredient.stockLevel,
        reorder_point: ingredient.reorderPoint,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      unit: data.unit,
      price: parseFloat(data.price),
      previousPrice: data.previous_price ? parseFloat(data.previous_price) : undefined,
      stockLevel: parseFloat(data.stock_level),
      reorderPoint: parseFloat(data.reorder_point),
      outletId: data.outlet_id,
    };
  }

  static async updateIngredient(id: string, updates: Partial<Omit<Ingredient, 'id' | 'outletId'>>): Promise<Ingredient> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.unit !== undefined) updateData.unit = updates.unit;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.previousPrice !== undefined) updateData.previous_price = updates.previousPrice;
    if (updates.stockLevel !== undefined) updateData.stock_level = updates.stockLevel;
    if (updates.reorderPoint !== undefined) updateData.reorder_point = updates.reorderPoint;

    const { data, error } = await supabase
      .from('ingredients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      unit: data.unit,
      price: parseFloat(data.price),
      previousPrice: data.previous_price ? parseFloat(data.previous_price) : undefined,
      stockLevel: parseFloat(data.stock_level),
      reorderPoint: parseFloat(data.reorder_point),
      outletId: data.outlet_id,
    };
  }

  static async deleteIngredient(id: string): Promise<void> {
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getMenuItems(): Promise<Omit<MenuItem, 'cogs' | 'actualMargin' | 'marginStatus'>[]> {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      imageUrl: item.image_url,
      sellingPrice: parseFloat(item.selling_price),
      targetMargin: parseFloat(item.target_margin),
      recipe: [],
    }));
  }

  static async getRecipes(): Promise<{ menuItemId: string; ingredientId: string; quantity: number }[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*');

    if (error) throw error;
    return (data || []).map(item => ({
      menuItemId: item.menu_item_id,
      ingredientId: item.ingredient_id,
      quantity: parseFloat(item.quantity),
    }));
  }

  static async addMenuItem(
    menuItem: Omit<MenuItem, 'id' | 'cogs' | 'actualMargin' | 'marginStatus'>,
    recipeIngredients: { ingredientId: string; quantity: number }[]
  ): Promise<string> {
    const { data: menuData, error: menuError } = await supabase
      .from('menu_items')
      .insert({
        name: menuItem.name,
        image_url: menuItem.imageUrl,
        selling_price: menuItem.sellingPrice,
        target_margin: menuItem.targetMargin,
      })
      .select()
      .single();

    if (menuError) throw menuError;

    if (recipeIngredients.length > 0) {
      const recipeData = recipeIngredients.map(r => ({
        menu_item_id: menuData.id,
        ingredient_id: r.ingredientId,
        quantity: r.quantity,
      }));

      const { error: recipeError } = await supabase
        .from('recipes')
        .insert(recipeData);

      if (recipeError) throw recipeError;
    }

    return menuData.id;
  }

  static async updateMenuItem(
    id: string,
    menuItem: Partial<Omit<MenuItem, 'id' | 'cogs' | 'actualMargin' | 'marginStatus'>>,
    recipeIngredients?: { ingredientId: string; quantity: number }[]
  ): Promise<void> {
    const updateData: any = {};
    if (menuItem.name !== undefined) updateData.name = menuItem.name;
    if (menuItem.imageUrl !== undefined) updateData.image_url = menuItem.imageUrl;
    if (menuItem.sellingPrice !== undefined) updateData.selling_price = menuItem.sellingPrice;
    if (menuItem.targetMargin !== undefined) updateData.target_margin = menuItem.targetMargin;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('menu_items')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    }

    if (recipeIngredients) {
      await supabase.from('recipes').delete().eq('menu_item_id', id);

      if (recipeIngredients.length > 0) {
        const recipeData = recipeIngredients.map(r => ({
          menu_item_id: id,
          ingredient_id: r.ingredientId,
          quantity: r.quantity,
        }));

        const { error: recipeError } = await supabase
          .from('recipes')
          .insert(recipeData);

        if (recipeError) throw recipeError;
      }
    }
  }

  static async deleteMenuItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getSalesHistory(outletId?: string): Promise<SalesHistoryRecord[]> {
    let query = supabase.from('sales_history').select('*');

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => ({
      date: item.date,
      menuItemId: item.menu_item_id,
      quantitySold: item.quantity_sold,
      totalRevenue: parseFloat(item.total_revenue),
      outletId: item.outlet_id,
    }));
  }

  static async addSalesRecord(sales: Omit<SalesHistoryRecord, 'id'>): Promise<void> {
    const { error } = await supabase
      .from('sales_history')
      .insert({
        outlet_id: sales.outletId,
        menu_item_id: sales.menuItemId,
        date: sales.date,
        quantity_sold: sales.quantitySold,
        total_revenue: sales.totalRevenue,
      });

    if (error) throw error;
  }

  static async getOperationalCosts(outletId?: string): Promise<OperationalCost[]> {
    let query = supabase.from('operational_costs').select('*');

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      amount: parseFloat(item.amount),
      interval: item.interval as 'daily' | 'monthly',
      outletId: item.outlet_id,
    }));
  }

  static async addOperationalCost(cost: Omit<OperationalCost, 'id'>): Promise<OperationalCost> {
    const { data, error } = await supabase
      .from('operational_costs')
      .insert({
        outlet_id: cost.outletId,
        name: cost.name,
        amount: cost.amount,
        interval: cost.interval,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      amount: parseFloat(data.amount),
      interval: data.interval,
      outletId: data.outlet_id,
    };
  }

  static async updateOperationalCost(cost: OperationalCost): Promise<void> {
    const { error } = await supabase
      .from('operational_costs')
      .update({
        name: cost.name,
        amount: cost.amount,
        interval: cost.interval,
      })
      .eq('id', cost.id);

    if (error) throw error;
  }

  static async deleteOperationalCost(id: string): Promise<void> {
    const { error } = await supabase
      .from('operational_costs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getWasteRecords(outletId?: string): Promise<WasteRecord[]> {
    let query = supabase.from('waste_records').select('*');

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      date: item.date,
      ingredientId: item.ingredient_id,
      quantity: parseFloat(item.quantity),
      reason: item.reason as any,
      cost: parseFloat(item.cost),
      outletId: item.outlet_id,
    }));
  }

  static async addWasteRecord(record: Omit<WasteRecord, 'id'>): Promise<void> {
    const { error } = await supabase
      .from('waste_records')
      .insert({
        outlet_id: record.outletId,
        ingredient_id: record.ingredientId,
        date: record.date,
        quantity: record.quantity,
        reason: record.reason,
        cost: record.cost,
      });

    if (error) throw error;
  }

  static async deleteWasteRecord(id: string): Promise<void> {
    const { error } = await supabase
      .from('waste_records')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async addSupplier(supplier: Omit<Supplier, 'id'>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSupplier(supplier: Supplier): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .update({
        name: supplier.name,
        contact_person: supplier.contactPerson,
        phone: supplier.phone,
      })
      .eq('id', supplier.id);

    if (error) throw error;
  }

  static async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getSupplierPrices(): Promise<SupplierPriceListItem[]> {
    const { data, error } = await supabase
      .from('supplier_prices')
      .select('*');

    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      supplierId: item.supplier_id,
      ingredientId: item.ingredient_id,
      price: parseFloat(item.price),
    }));
  }

  static async addSupplierPrice(supplierId: string, ingredientId: string, price: number): Promise<void> {
    const { error } = await supabase
      .from('supplier_prices')
      .insert({
        supplier_id: supplierId,
        ingredient_id: ingredientId,
        price,
      });

    if (error) throw error;
  }

  static async updateSupplierPrice(id: string, price: number): Promise<void> {
    const { error } = await supabase
      .from('supplier_prices')
      .update({ price })
      .eq('id', id);

    if (error) throw error;
  }

  static async deleteSupplierPrice(id: string): Promise<void> {
    const { error } = await supabase
      .from('supplier_prices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getPendingOrders(outletId?: string): Promise<PendingOrder[]> {
    let query = supabase.from('pending_orders').select('*, suppliers(id, name)');

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query.order('order_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      poNumber: item.po_number,
      supplier: {
        id: item.suppliers.id,
        name: item.suppliers.name,
      },
      orderDate: item.order_date,
      items: item.items,
      totalAmount: parseFloat(item.total_amount),
      outletId: item.outlet_id,
    }));
  }

  static async addPendingOrder(order: Omit<PendingOrder, 'id' | 'poNumber' | 'orderDate'>): Promise<void> {
    const poNumber = `PO-${Date.now()}`;
    const { error } = await supabase
      .from('pending_orders')
      .insert({
        outlet_id: order.outletId,
        supplier_id: order.supplier.id,
        po_number: poNumber,
        items: order.items,
        total_amount: order.totalAmount,
      });

    if (error) throw error;
  }

  static async deletePendingOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from('pending_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getActiveCampaign(): Promise<ActiveCampaign | null> {
    const { data, error } = await supabase
      .from('active_campaigns')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      campaignName: data.campaign_name,
      marketingCopy: data.marketing_copy,
      promoMechanic: data.promo_mechanic,
      justification: data.justification,
      involvedItems: {
        item1Name: data.item1_name,
        item2Name: data.item2_name,
      },
      startDate: data.start_date,
    };
  }

  static async launchCampaign(campaign: MarketingCampaignSuggestion): Promise<void> {
    await supabase.from('active_campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error } = await supabase
      .from('active_campaigns')
      .insert({
        campaign_name: campaign.campaignName,
        marketing_copy: campaign.marketingCopy,
        promo_mechanic: campaign.promoMechanic,
        justification: campaign.justification,
        item1_name: campaign.involvedItems.item1Name,
        item2_name: campaign.involvedItems.item2Name,
      });

    if (error) throw error;
  }

  static async endCampaign(): Promise<void> {
    await supabase
      .from('active_campaigns')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
  }

  static async getUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      name: data.name,
      role: data.role,
      avatarUrl: data.avatar_url,
    };
  }

  static async upsertUser(userId: string, user: Omit<User, 'avatarUrl'>): Promise<void> {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        name: user.name,
        role: user.role,
        avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${user.name}`,
      });

    if (error) throw error;
  }
}
