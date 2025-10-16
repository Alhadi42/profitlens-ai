# Database Integration Documentation

## Overview

ProfitLens AI is now fully integrated with Supabase for backend data persistence. All application data is stored in a PostgreSQL database with proper security and relationships.

## Database Schema

### Tables

1. **outlets** - Store outlet/branch information
2. **ingredients** - Track inventory items per outlet
3. **menu_items** - Menu items available across outlets
4. **recipes** - Junction table linking menu items to ingredients
5. **sales_history** - Daily sales records per outlet
6. **operational_costs** - Operational expenses per outlet
7. **waste_records** - Waste tracking per outlet
8. **suppliers** - Supplier directory
9. **supplier_prices** - Supplier pricing for ingredients
10. **pending_orders** - Purchase orders awaiting fulfillment
11. **active_campaigns** - Marketing campaigns
12. **users** - User profile data

### Security

- **Row Level Security (RLS)** enabled on all tables
- Authenticated users can perform CRUD operations
- Foreign key constraints ensure data integrity
- Indexes on frequently queried columns for performance

## Architecture

### Service Layer

**File:** `services/databaseService.ts`

Provides methods for all database operations:
- CRUD operations for all entities
- Type-safe interfaces
- Error handling
- Data transformation between database and application formats

### Data Hook

**File:** `hooks/useSupabaseData.ts`

React hook that:
- Loads all data on mount
- Provides computed values (margins, stats, etc.)
- Exposes CRUD methods
- Manages local state
- Filters data by current outlet

### Legacy Hook

**File:** `hooks/useProfitLensData.ts`

The original localStorage-based hook is preserved for reference but no longer used in the application.

## Key Features

### Multi-Outlet Support
- Data is filtered by outlet
- Each outlet has its own inventory, sales, and costs
- Outlets can be created, updated, and deleted (with validation)

### Real-Time Calculations
- Menu item costs (COGS) calculated from ingredient prices
- Profit margins computed automatically
- Waste costs aggregated over time periods
- P&L statements generated from actual data

### Data Relationships
- Recipes link menu items to ingredients
- Sales records reference both outlets and menu items
- Purchase orders track supplier and outlet relationships
- Supplier prices create a many-to-many relationship

## Usage

### Initialization

The application automatically loads all data when it starts:

```typescript
const {
  loading,
  ingredients,
  menuItems,
  salesHistory,
  // ... other data
  addIngredient,
  updateIngredient,
  // ... other methods
} = useSupabaseData();
```

### Adding Data

All add operations are async:

```typescript
await addIngredient({
  name: 'Coffee Beans',
  unit: 'gram',
  price: 300,
  stockLevel: 5000,
  reorderPoint: 500,
  outletId: currentOutletId
});
```

### Updating Data

Updates also return promises:

```typescript
await updateIngredientPrice(ingredientId, newPrice);
await loadAllData(); // Refresh data after update
```

### Data Flow

1. User action triggers a method call
2. Method calls DatabaseService
3. DatabaseService executes Supabase query
4. On success, local state is updated via `loadAllData()`
5. React re-renders with new data

## Migration Details

The database schema is created via migration file:
- **File:** Applied via `mcp__supabase__apply_migration`
- **Contains:** Table definitions, indexes, RLS policies, triggers
- **Idempotent:** Uses `IF NOT EXISTS` for safe re-runs

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## Future Enhancements

- Real-time subscriptions for live updates
- Offline support with sync
- User-based RLS policies (currently open to all authenticated users)
- Audit logging for changes
- Backup and restore functionality
