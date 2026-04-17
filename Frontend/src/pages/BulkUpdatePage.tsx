import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  RefreshCw,
  Percent,
  DollarSign,
  Save,
  RotateCcw,
  CheckSquare,
  Square,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { usePageTitle } from "@/hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogItem = {
  _id: string;
  name: string;
  price: number;
  category: string;
  pieces?: number;
  icon?: string;
  isActive?: boolean;
};

type EditRow = {
  _id: string;
  name: string;
  originalPrice: number;
  price: string;        // editable string
  category: string;
  pieces: number;
  dirty: boolean;
};

const CATEGORIES = ["Dry Cleaning", "Laundry", "Pressing"];

const categoryColor = (cat: string) => {
  switch (cat) {
    case "Dry Cleaning": return "border-primary/40 text-primary";
    case "Laundry":      return "border-blue-500/40 text-blue-500";
    case "Pressing":     return "border-amber-500/40 text-amber-600";
    default:             return "border-border text-muted-foreground";
  }
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const BulkUpdatePage = () => {
  usePageTitle("Bulk Update");
  const navigate = useNavigate();

  const [rows, setRows] = useState<EditRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterSearch, setFilterSearch] = useState("");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Bulk adjustment
  const [adjustMode, setAdjustMode] = useState<"percent" | "fixed">("percent");
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustDirection, setAdjustDirection] = useState<"increase" | "decrease">("increase");

  // ── Load items ─────────────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setSavedCount(null);
    const { data, error } = await api.getItems();
    if (!error && data) {
      const items = data as CatalogItem[];
      setRows(
        items.map((item) => ({
          _id: item._id,
          name: item.name,
          originalPrice: item.price,
          price: item.price.toFixed(2),
          category: item.category,
          pieces: item.pieces || 1,
          dirty: false,
        }))
      );
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const filtered = rows.filter((r) => {
    if (filterCategory !== "All" && r.category !== filterCategory) return false;
    if (filterSearch && !r.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const filteredIds = filtered.map((r) => r._id);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  // ── Inline price edit ──────────────────────────────────────────────────────
  const updatePrice = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r._id === id
          ? { ...r, price: value, dirty: parseFloat(value) !== r.originalPrice }
          : r
      )
    );
  };

  // ── Bulk adjust ────────────────────────────────────────────────────────────
  const applyBulkAdjust = () => {
    const val = parseFloat(adjustValue);
    if (isNaN(val) || val < 0) {
      alert("Enter a valid positive number.");
      return;
    }
    if (selected.size === 0) {
      alert("Select at least one item to adjust.");
      return;
    }

    setRows((prev) =>
      prev.map((r) => {
        if (!selected.has(r._id)) return r;
        let newPrice: number;
        const current = parseFloat(r.price) || r.originalPrice;
        if (adjustMode === "percent") {
          const factor = adjustDirection === "increase" ? 1 + val / 100 : 1 - val / 100;
          newPrice = Math.max(0, current * factor);
        } else {
          newPrice =
            adjustDirection === "increase" ? current + val : Math.max(0, current - val);
        }
        return {
          ...r,
          price: newPrice.toFixed(2),
          dirty: newPrice !== r.originalPrice,
        };
      })
    );
  };

  // ── Reset selection to original ────────────────────────────────────────────
  const resetSelected = () => {
    setRows((prev) =>
      prev.map((r) =>
        selected.has(r._id)
          ? { ...r, price: r.originalPrice.toFixed(2), dirty: false }
          : r
      )
    );
  };

  // ── Save dirty rows ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const dirty = rows.filter((r) => r.dirty);
    if (dirty.length === 0) {
      alert("No changes to save.");
      return;
    }

    // validate all dirty rows have a valid positive price
    for (const r of dirty) {
      const p = parseFloat(r.price);
      if (isNaN(p) || p <= 0) {
        alert(`Invalid price for "${r.name}". All prices must be greater than 0.`);
        return;
      }
    }

    setIsSaving(true);
    let successCount = 0;
    try {
      await Promise.all(
        dirty.map(async (r) => {
          const { error } = await api.updateItem(r._id, { price: parseFloat(r.price) });
          if (!error) successCount++;
        })
      );
      // Commit originals
      setRows((prev) =>
        prev.map((r) =>
          r.dirty
            ? { ...r, originalPrice: parseFloat(r.price), dirty: false }
            : r
        )
      );
      setSavedCount(successCount);
      setSelected(new Set());
    } catch (err) {
      console.error("Bulk save error:", err);
      alert("Some items failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const dirtyRows = rows.filter((r) => r.dirty);
  const increases = dirtyRows.filter((r) => parseFloat(r.price) > r.originalPrice);
  const decreases = dirtyRows.filter((r) => parseFloat(r.price) < r.originalPrice);

  return (
    <>
      <AppHeader title="Bulk Price Update" />
      <div className="flex-1 p-6 space-y-6 max-w-5xl">

        {/* Back + summary bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Admin
          </Button>

          <div className="flex items-center gap-3 flex-wrap">
            {dirtyRows.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                {increases.length > 0 && (
                  <span className="flex items-center gap-1 text-success font-medium">
                    <TrendingUp className="w-4 h-4" /> {increases.length} increase{increases.length !== 1 ? "s" : ""}
                  </span>
                )}
                {decreases.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive font-medium">
                    <TrendingDown className="w-4 h-4" /> {decreases.length} decrease{decreases.length !== 1 ? "s" : ""}
                  </span>
                )}
                <Badge variant="secondary">{dirtyRows.length} unsaved change{dirtyRows.length !== 1 ? "s" : ""}</Badge>
              </div>
            )}
            {savedCount !== null && (
              <Badge className="bg-success text-success-foreground">
                ✓ {savedCount} item{savedCount !== 1 ? "s" : ""} saved
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadItems}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Reload
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSave}
              disabled={isSaving || dirtyRows.length === 0}
            >
              <Save className="w-4 h-4 mr-1.5" />
              {isSaving ? "Saving…" : `Save ${dirtyRows.length > 0 ? `(${dirtyRows.length})` : "Changes"}`}
            </Button>
          </div>
        </div>

        {/* Bulk adjust panel */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="w-4 h-4 text-accent" /> Bulk Adjustment
            </CardTitle>
            <CardDescription>
              Select items in the table below, then apply a price adjustment to all at once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Adjust by</Label>
                <Select value={adjustMode} onValueChange={(v) => setAdjustMode(v as "percent" | "fixed")}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Direction</Label>
                <Select value={adjustDirection} onValueChange={(v) => setAdjustDirection(v as "increase" | "decrease")}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  Value {adjustMode === "percent" ? "(%)" : "($)"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step={adjustMode === "percent" ? "1" : "0.01"}
                  placeholder={adjustMode === "percent" ? "e.g. 10" : "e.g. 1.50"}
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                  className="w-36"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={applyBulkAdjust}
                  disabled={selected.size === 0 || !adjustValue}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {adjustDirection === "increase"
                    ? <TrendingUp className="w-4 h-4 mr-1.5" />
                    : <TrendingDown className="w-4 h-4 mr-1.5" />}
                  Apply to {selected.size > 0 ? `${selected.size} selected` : "selection"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetSelected}
                  disabled={selected.size === 0}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters + table */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Item Prices</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search items…"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-48 h-8 text-sm"
                />
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-44 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  {selected.size > 0 ? `${selected.size} selected` : "None selected"}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading items…
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-6">
                      <button onClick={toggleAll} className="flex items-center justify-center">
                        {allFilteredSelected
                          ? <CheckSquare className="w-4 h-4 text-primary" />
                          : <Square className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Original Price</TableHead>
                    <TableHead className="text-right w-40">New Price (USD)</TableHead>
                    <TableHead className="text-right w-28">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No items match the current filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row) => {
                      const newPrice = parseFloat(row.price);
                      const diff = isNaN(newPrice) ? 0 : newPrice - row.originalPrice;
                      const pctChange = row.originalPrice > 0 ? (diff / row.originalPrice) * 100 : 0;
                      const isIncrease = diff > 0;
                      const isDecrease = diff < 0;

                      return (
                        <TableRow
                          key={row._id}
                          className={row.dirty ? "bg-accent/5" : undefined}
                        >
                          <TableCell className="pl-6">
                            <Checkbox
                              checked={selected.has(row._id)}
                              onCheckedChange={() => toggleOne(row._id)}
                            />
                          </TableCell>

                          <TableCell className="font-medium">
                            {row.name}
                            {row.dirty && (
                              <span className="ml-2 text-xs text-accent font-semibold">●</span>
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${categoryColor(row.category)}`}>
                              {row.category}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right text-muted-foreground font-mono text-sm">
                            ${row.originalPrice.toFixed(2)}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-muted-foreground text-xs">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.price}
                                onChange={(e) => updatePrice(row._id, e.target.value)}
                                className={`w-28 h-8 text-right font-mono text-sm ${
                                  row.dirty ? "border-accent ring-1 ring-accent/30" : ""
                                }`}
                              />
                            </div>
                          </TableCell>

                          <TableCell className="text-right text-sm font-medium">
                            {row.dirty && !isNaN(newPrice) ? (
                              <span
                                className={
                                  isIncrease
                                    ? "text-success"
                                    : isDecrease
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                }
                              >
                                {isIncrease ? "+" : ""}
                                {diff.toFixed(2)} ({pctChange >= 0 ? "+" : ""}
                                {pctChange.toFixed(1)}%)
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Bottom save bar — only shown when there are changes */}
        {dirtyRows.length > 0 && (
          <div className="sticky bottom-6 flex justify-end">
            <div className="bg-card border border-border shadow-xl rounded-xl px-5 py-3 flex items-center gap-4 animate-fade-in">
              <span className="text-sm text-muted-foreground">
                {dirtyRows.length} unsaved change{dirtyRows.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRows((prev) =>
                    prev.map((r) => ({
                      ...r,
                      price: r.originalPrice.toFixed(2),
                      dirty: false,
                    }))
                  );
                  setSelected(new Set());
                }}
              >
                Discard All
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-1.5" />
                {isSaving ? "Saving…" : `Save ${dirtyRows.length} Change${dirtyRows.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BulkUpdatePage;
