import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, RefreshCw, Plus, X, LayoutList } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageTitle } from "@/hooks/usePageTitle";

// Item icons mapping based on item name/category
const getItemIcon = (name: string, category: string) => {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes("suit")) return "👔";
  if (nameLower.includes("dress")) return "👗";
  if (nameLower.includes("shirt")) return "👕";
  if (nameLower.includes("trouser") || nameLower.includes("pant")) return "👖";
  if (nameLower.includes("blouse")) return "👚";
  if (nameLower.includes("jacket")) return "🧥";
  if (nameLower.includes("coat")) return "🧥";
  if (nameLower.includes("curtain")) return "🪟";
  if (nameLower.includes("blanket") || nameLower.includes("duvet")) return "🛏️";
  if (nameLower.includes("tie")) return "👔";
  if (nameLower.includes("shoe")) return "👞";
  if (nameLower.includes("sock")) return "🧦";
  if (nameLower.includes("hat") || nameLower.includes("cap")) return "🧢";
  if (nameLower.includes("scarf")) return "🧣";
  if (nameLower.includes("sweater") || nameLower.includes("jumper")) return "🧶";
  if (nameLower.includes("wedding")) return "💒";
  
  // Category-based fallback
  if (category === "Dry Cleaning") return "✨";
  if (category === "Laundry") return "🧺";
  if (category === "Pressing") return "👕";
  
  return "👕";
};

const categories = ["Dry Cleaning", "Laundry", "Pressing"];

type CatalogItem = {
  _id: string;
  name: string;
  price: number;
  category: string;
  pieces?: number;
  icon?: string;
  isActive?: boolean;
};

const AdminPage = () => {
  usePageTitle("Admin");
  const navigate = useNavigate();
  const [exchangeRate, setExchangeRate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentRate, setCurrentRate] = useState<any>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", price: "", category: "Dry Cleaning", pieces: "1" });
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Fetch items from database
  const fetchItems = async () => {
    setIsLoadingItems(true);
    try {
      const { data, error } = await api.getItems();
      if (error) {
        console.error("Failed to fetch items:", error);
        return;
      }
      if (data) {
        setCatalogItems(data as CatalogItem[]);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    // Fetch current exchange rate on mount
    const fetchCurrentRate = async () => {
      try {
        const { data } = await api.getCurrentExchangeRate();
        if (data) {
          setCurrentRate(data);
          setExchangeRate(data.rate.toString());
        }
      } catch (error) {
        console.error("Failed to fetch current exchange rate:", error);
        // Set default if no rate exists
        setExchangeRate("32.5");
      }
    };

    fetchCurrentRate();
    fetchItems();
  }, []);

  const handleUpdateRate = async () => {
    if (!exchangeRate || parseFloat(exchangeRate) <= 0) {
      alert("Please enter a valid exchange rate");
      return;
    }

    setIsUpdating(true);
    try {
      const { data, error } = await api.createExchangeRate({
        rate: parseFloat(exchangeRate),
        effectiveDate: new Date().toISOString(),
        source: "Admin Panel",
        notes: "Exchange rate updated from admin panel",
        isActive: true,
      });

      if (error) {
        alert("Failed to update exchange rate: " + error);
        return;
      }

      setCurrentRate(data);
      alert("Exchange rate updated successfully to " + exchangeRate);
    } catch (error) {
      console.error("Error updating exchange rate:", error);
      alert("Failed to update exchange rate. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openAddItemDialog = () => {
    setEditingItem(null);
    setItemForm({ name: "", price: "", category: "Dry Cleaning", pieces: "1" });
    setIsItemDialogOpen(true);
  };

  const openEditItemDialog = (item: CatalogItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      pieces: (item.pieces || 1).toString(),
    });
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    const { name, price, category, pieces } = itemForm;
    
    if (!name.trim()) {
      alert("Please enter an item name");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter a valid price");
      return;
    }

    const piecesNum = parseInt(pieces) || 1;

    setIsSavingItem(true);
    try {
      if (editingItem) {
        // Update existing item via API
        const { data, error } = await api.updateItem(editingItem._id, {
          name: name.trim(),
          price: priceNum,
          category,
          pieces: piecesNum,
          icon: getItemIcon(name.trim(), category)
        });

        if (error) {
          alert("Failed to update item: " + error);
          return;
        }

        setCatalogItems((prev) =>
          prev.map((item) =>
            item._id === editingItem._id ? (data as CatalogItem) : item
          )
        );
      } else {
        // Add new item via API
        const { data, error } = await api.createItem({
          name: name.trim(),
          price: priceNum,
          category,
          pieces: piecesNum,
          icon: getItemIcon(name.trim(), category)
        });

        if (error) {
          alert("Failed to create item: " + error);
          return;
        }

        setCatalogItems((prev) => [...prev, data as CatalogItem]);
      }

      setIsItemDialogOpen(false);
      setEditingItem(null);
      setItemForm({ name: "", price: "", category: "Dry Cleaning", pieces: "1" });
    } catch (error) {
      console.error("Error saving item:", error);
      alert("Failed to save item. Please try again.");
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleAddItem = openAddItemDialog;

  const handleEditItem = (itemId: string) => {
    const item = catalogItems.find((catalogItem) => catalogItem._id === itemId);
    if (item) {
      openEditItemDialog(item);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const shouldDelete = window.confirm("Delete this item?");
    if (!shouldDelete) {
      return;
    }

    try {
      const { error } = await api.deleteItem(itemId);
      if (error) {
        alert("Failed to delete item: " + error);
        return;
      }
      setCatalogItems((prev) => prev.filter((catalogItem) => catalogItem._id !== itemId));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item. Please try again.");
    }
  };

  return (
    <>
      <AppHeader title="Administration" />
      <div className="flex-1 p-6 space-y-6 max-w-4xl">
        {/* Exchange Rate */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-accent" /> Exchange Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <Label>1 USD = ZWL</Label>
                <Input 
                  type="number" 
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="Enter exchange rate"
                  step="0.01"
                  min="0"
                />
              </div>
              <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
                onClick={handleUpdateRate}
                disabled={isUpdating}
              >
                {isUpdating ? "Updating..." : "Update Rate"}
              </Button>
            </div>
            {currentRate && (
              <p className="text-xs text-muted-foreground">
                Current rate: {currentRate.rate} (Last updated: {new Date(currentRate.updatedAt).toLocaleString()})
              </p>
            )}
          </CardContent>
        </Card>

        {/* Item Catalog */}
        <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Item Catalog
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/admin/bulk-update")}
              >
                <LayoutList className="w-4 h-4 mr-1" /> Bulk Update
              </Button>
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleAddItem}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory("All")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === "All"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                All ({catalogItems.length})
              </button>
              {categories.map((cat) => {
                const count = catalogItems.filter((item) => item.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {isLoadingItems ? (
                <div className="col-span-full py-8 text-center text-muted-foreground">
                  Loading items...
                </div>
              ) : catalogItems
                .filter((item) => selectedCategory === "All" || item.category === selectedCategory)
                .map((item, index) => (
                  <div
                    key={item._id}
                    className="group relative bg-card border border-border rounded-xl p-4 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => openEditItemDialog(item)}
                  >
                    {/* Delete button */}
                    <button
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item._id);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Icon */}
                    <div className="text-4xl mb-3 text-center">
                      {item.icon || getItemIcon(item.name, item.category)}
                    </div>

                    {/* Item Name */}
                    <div className="text-sm font-semibold text-foreground text-center truncate">
                      {item.name}
                    </div>

                    {/* Price */}
                    <div className="text-lg font-bold text-accent text-center mt-1">
                      ${item.price.toFixed(2)}
                    </div>

                    {/* Category Badge */}
                    <div className="flex justify-center mt-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          item.category === "Dry Cleaning" 
                            ? "border-primary/30 text-primary" 
                            : "border-blue-500/30 text-blue-500"
                        }`}
                      >
                        {item.category === "Dry Cleaning" ? "✨" : "🧺"} {item.category}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>

            {catalogItems.filter((item) => selectedCategory === "All" || item.category === selectedCategory).length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <p>No items in this category</p>
                <Button variant="link" size="sm" onClick={() => setSelectedCategory("All")}>
                  View all items
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Item Dialog */}
        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
              <DialogDescription>
                {editingItem 
                  ? "Update the item details below" 
                  : "Fill in the details for the new catalog item"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Preview Icon */}
              <div className="flex justify-center">
                <div className="text-6xl p-4 bg-muted rounded-xl">
                  {getItemIcon(itemForm.name || "item", itemForm.category)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemName">Item Name</Label>
                <Input
                  id="itemName"
                  value={itemForm.name}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Suit (2pc)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemCategory">Category</Label>
                <Select
                  value={itemForm.category}
                  onValueChange={(value) => setItemForm((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="itemCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "Dry Cleaning" ? "✨" : cat === "Laundry" ? "🧺" : "👕"} {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemPrice">Price (USD)</Label>
                <Input
                  id="itemPrice"
                  type="number"
                  value={itemForm.price}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemPieces">Number of Pieces</Label>
                <Input
                  id="itemPieces"
                  type="number"
                  value={itemForm.pieces}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, pieces: e.target.value }))}
                  placeholder="1"
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  Default pieces per item (e.g., 3-piece suit = 3)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsItemDialogOpen(false)} disabled={isSavingItem}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveItem}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={isSavingItem}
              >
                {isSavingItem ? "Saving..." : editingItem ? "Save Changes" : "Add Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default AdminPage;
