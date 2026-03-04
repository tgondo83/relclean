import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Minus, Plus, ShoppingCart, User, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBranch, getBranchId } from "@/context/BranchContext";

const categories = ["All", "Dry Cleaning", "Laundry", "Pressing"];

// Item icon mapping
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
  if (nameLower.includes("towel")) return "🛁";
  if (nameLower.includes("sheet")) return "🛏️";
  
  // Category-based fallback
  if (category === "Dry Cleaning") return "✨";
  if (category === "Laundry") return "🧺";
  if (category === "Pressing") return "👕";
  
  return "👕";
};

interface CatalogItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  pieces?: number;
  icon?: string;
  isActive?: boolean;
}

type CartItem = { _id: string; name: string; price: number; qty: number; pieces: number };

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

const NewOrderPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [itemSearch, setItemSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerMatches, setCustomerMatches] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { selectedBranch } = useBranch();
  const navigate = useNavigate();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const findMatchingCustomersRef = useRef<(searchValue: string) => Customer[]>(() => []);

  // Fetch items from database
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoadingItems(true);
      try {
        const { data, error } = await api.getItems({ isActive: true });
        if (error) {
          console.error("Failed to fetch items:", error);
          return;
        }
        if (data) {
          setItems(data as CatalogItem[]);
        }
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchItems();
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await api.getCustomers();
      if (error) {
        console.error("Failed to fetch customers:", error);
        return;
      }

      if (data && !Array.isArray(data) && 'customers' in data) {
        setCustomers((data as { customers: Customer[] }).customers);
      } else if (Array.isArray(data)) {
        setCustomers(data as Customer[]);
      }
    };

    fetchCustomers();
  }, []);

  const normalizePhone = (value: string) => value.replace(/\D/g, "");

  const isPhoneSearch = (value: string) => normalizePhone(value).length >= 7;

  const findMatchingCustomers = useCallback((searchValue: string) => {
    const query = searchValue.trim();
    if (!query || query.length < 2) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const queryDigits = normalizePhone(query);

    // Score-based matching for better relevance
    const scored = customers.map((customer) => {
      let score = 0;
      const nameLower = customer.name.toLowerCase();
      const phoneLower = customer.phone.toLowerCase();
      const emailLower = (customer.email || "").toLowerCase();
      const phoneDigits = normalizePhone(customer.phone);

      // Exact name match (highest priority)
      if (nameLower === lowerQuery) score += 100;
      // Name starts with query
      else if (nameLower.startsWith(lowerQuery)) score += 50;
      // Name contains query
      else if (nameLower.includes(lowerQuery)) score += 30;

      // Phone exact match
      if (phoneLower === lowerQuery || phoneDigits === queryDigits) score += 80;
      // Phone contains query
      else if (phoneLower.includes(lowerQuery) || (queryDigits.length >= 3 && phoneDigits.includes(queryDigits))) score += 40;

      // Email match
      if (emailLower && emailLower.includes(lowerQuery)) score += 25;

      return { customer, score };
    });

    return scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ customer }) => customer);
  }, [customers]);

  // Keep ref updated with latest findMatchingCustomers
  useEffect(() => {
    findMatchingCustomersRef.current = findMatchingCustomers;
  }, [findMatchingCustomers]);

  // Debounced search handler
  const debouncedSearch = useCallback((value: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!value.trim() || value.trim().length < 2) {
      setCustomerMatches([]);
      setIsSearching(false);
      setHighlightedIndex(-1);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(() => {
      const matches = findMatchingCustomersRef.current(value);
      setCustomerMatches(matches);
      setIsSearching(false);
      setHighlightedIndex(-1);
    }, 200);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleCustomerLookup = () => {
    const query = customerSearch.trim();
    if (!query) {
      setCustomerMatches([]);
      setSelectedCustomer(null);
      setHighlightedIndex(-1);
      return;
    }

    const matches = findMatchingCustomers(query);
    setCustomerMatches(matches);
    setHighlightedIndex(-1);

    if (matches.length === 1) {
      setSelectedCustomer(matches[0]);
      setCustomerSearch(`${matches[0].name} (${matches[0].phone})`);
      setCustomerMatches([]);
      setHighlightedIndex(-1);
      return;
    }

    if (matches.length === 0 && isPhoneSearch(query)) {
      setNewCustomer({
        name: "",
        phone: query,
        email: "",
        address: "",
      });
      setIsCreateCustomerOpen(true);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(`${customer.name} (${customer.phone})`);
    setCustomerMatches([]);
    setHighlightedIndex(-1);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      alert("Name and phone number are required");
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const payload = {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        email: newCustomer.email.trim() || undefined,
        address: newCustomer.address.trim() || undefined,
      };

      const { data, error } = await api.createCustomer(payload);
      
      if (error) {
        // Check if it's a duplicate phone number error
        if (error.includes("already exists")) {
          const existingCustomer = findMatchingCustomers(newCustomer.phone)[0];
          if (existingCustomer) {
            const confirmed = window.confirm(
              `A customer with phone ${newCustomer.phone} already exists: ${existingCustomer.name}\n\nSelect this customer for the order?`
            );
            if (confirmed) {
              setSelectedCustomer(existingCustomer);
              setCustomerSearch(`${existingCustomer.name} (${existingCustomer.phone})`);
              setIsCreateCustomerOpen(false);
              setNewCustomer({ name: "", phone: "", email: "", address: "" });
            }
          }
        } else {
          alert("Failed to create customer: " + error);
        }
        return;
      }

      if (!data) {
        alert("Failed to create customer: Unknown error");
        return;
      }

      const createdCustomer = data as Customer;
      setCustomers((prev) => [createdCustomer, ...prev]);
      setSelectedCustomer(createdCustomer);
      setCustomerSearch(`${createdCustomer.name} (${createdCustomer.phone})`);
      setCustomerMatches([]);
      setIsCreateCustomerOpen(false);
      setNewCustomer({ name: "", phone: "", email: "", address: "" });
    } catch (error) {
      console.error("Error creating customer:", error);
      alert("Failed to create customer. Please try again.");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Filter items by category and text search
  const filteredItems = useMemo(() => {
    let result = items;
    
    // Filter by category
    if (selectedCategory !== "All") {
      result = result.filter((i) => i.category === selectedCategory);
    }
    
    // Filter by search text
    const searchTerm = itemSearch.trim().toLowerCase();
    if (searchTerm) {
      result = result.filter((i) => 
        i.name.toLowerCase().includes(searchTerm)
      );
    }
    
    return result;
  }, [selectedCategory, itemSearch, items]);

  const addToCart = (item: CatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c._id === item._id);
      if (existing) return prev.map((c) => (c._id === item._id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { _id: item._id, name: item.name, price: item.price, qty: 1, pieces: item.pieces || 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c._id === id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };



  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const totalPieces = cart.reduce((sum, c) => sum + c.pieces * c.qty, 0);

  const extractCreatedId = (payload: unknown): string | undefined => {
    if (!payload || typeof payload !== "object") return undefined;
    const obj = payload as Record<string, unknown>;
    if (typeof obj._id === "string") return obj._id;
    if (typeof obj.id === "string") return obj.id;
    return undefined;
  };

  const ensureCustomerId = async (): Promise<string | undefined> => {
    if (selectedCustomer?._id) return selectedCustomer._id;

    const raw = customerSearch.trim();
    const digits = normalizePhone(raw);

    // Try to match an existing customer from the already-fetched list.
    if (raw) {
      const matches = findMatchingCustomers(raw);
      if (matches.length === 1 && matches[0]?._id) {
        return matches[0]._id;
      }
    }

    // Create a walk-in customer so payments can be linked to a customer record.
    const walkInName = raw || "Walk-in Customer";
    const walkInPhone = digits.length >= 7 ? digits : `WALKIN-${Date.now()}`;

    const { data, error } = await api.createCustomer({
      name: walkInName,
      phone: walkInPhone,
    });

    if (!error) {
      const createdId = extractCreatedId(data);
      return createdId;
    }

    // If phone already exists, try selecting the existing customer.
    if (digits.length >= 7) {
      const existing = findMatchingCustomers(digits)[0];
      if (existing?._id) return existing._id;
    }

    return undefined;
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    
    if (!selectedBranch) {
      alert("Please select a branch");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const customerId = await ensureCustomerId();

      // Generate prefix from branch name if not provided
      const branchPrefix = selectedBranch.prefix || selectedBranch.name.substring(0, 2).toUpperCase();
      const branchId = getBranchId(selectedBranch);

      if (!branchId) {
        alert("Please select a branch");
        return;
      }
      
      const orderData = {
        branchId,
        branchPrefix: branchPrefix,
        customer: selectedCustomer?.name || customerSearch || "Walk-in Customer",
        items: cart.map(item => ({
          name: item.name,
          price: item.price,
          qty: item.qty,
          pieces: item.pieces
        })),
        totalPieces: totalPieces,
        total: total,
        status: "processing"
      };

      const { data, error } = await api.createOrder(orderData);
      
      if (error) {
        alert("Failed to create order: " + error);
      } else {
        const createdOrderId = extractCreatedId(data) || (data as { orderNumber?: string } | undefined)?.orderNumber;

        if (createdOrderId && customerId) {
          try {
            localStorage.setItem(`order_customer_${createdOrderId}`, customerId);
          } catch (storageError) {
            console.warn("Failed to persist customer mapping:", storageError);
          }
        }

        // Navigate to payment page with order data
        const paymentUrl = createdOrderId
          ? `/payment?orderId=${encodeURIComponent(createdOrderId)}`
          : "/payment";

        navigate(paymentUrl, { 
          state: { 
            order: {
              orderNumber: (data as { orderNumber?: string } | undefined)?.orderNumber,
              branchId,
              branchPrefix: branchPrefix,
              customer: orderData.customer,
              items: orderData.items,
              totalPieces: totalPieces,
              total: total,
              status: "processing"
            },
            orderId: createdOrderId,
            customerId,
          } 
        });
        // Clear cart for next order
        setCart([]);
        setCustomerSearch("");
        setSelectedCustomer(null);
      }
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title="New Order" />
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Left: Item Selection */}
        <div className="flex-1 flex flex-col min-w-0 space-y-4">
          {/* Customer and Branch Selection */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2 relative">
                    <Input
                      ref={customerInputRef}
                      placeholder="Search by name, phone, or email (min 2 chars)..."
                      value={customerSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCustomerSearch(value);
                        if (selectedCustomer) {
                          setSelectedCustomer(null);
                        }
                        debouncedSearch(value);
                      }}
                      onKeyDown={(e) => {
                        const matchCount = customerMatches.length;
                        
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlightedIndex((prev) => 
                            prev < matchCount - 1 ? prev + 1 : prev
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          if (highlightedIndex >= 0 && highlightedIndex < matchCount) {
                            handleSelectCustomer(customerMatches[highlightedIndex]);
                          } else {
                            handleCustomerLookup();
                          }
                        } else if (e.key === "Escape") {
                          setCustomerMatches([]);
                          setHighlightedIndex(-1);
                        }
                      }}
                      onBlur={() => {
                        // Delay to allow click on dropdown items
                        setTimeout(() => {
                          setHighlightedIndex(-1);
                        }, 150);
                      }}
                      className="flex-1"
                    />
                    {isSearching && (
                      <div className="absolute right-14 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <Button variant="outline" size="icon" onClick={handleCustomerLookup}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>

                  {selectedCustomer && (
                    <div className="flex items-center justify-between gap-2 rounded bg-accent/10 p-2 border border-accent/30">
                      <div className="text-xs text-muted-foreground">
                        <span>Selected: </span>
                        <span className="font-medium text-foreground">{selectedCustomer.name}</span>
                        <span className="ml-2">{selectedCustomer.phone}</span>
                        {selectedCustomer.email && (
                          <span className="ml-2 text-muted-foreground/70">{selectedCustomer.email}</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearch("");
                          customerInputRef.current?.focus();
                        }}
                        title="Remove selected customer"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Search results dropdown */}
                  {!selectedCustomer && customerSearch.trim().length >= 2 && (
                    <div className="rounded-md border border-border bg-popover shadow-md">
                      {isSearching ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          Searching...
                        </div>
                      ) : customerMatches.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          {customerMatches.slice(0, 8).map((customer, index) => (
                            <button
                              key={customer._id}
                              type="button"
                              onClick={() => handleSelectCustomer(customer)}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                index === highlightedIndex
                                  ? "bg-accent text-accent-foreground"
                                  : "hover:bg-secondary"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{customer.name}</span>
                                <span className="text-xs text-muted-foreground">{customer.phone}</span>
                              </div>
                              {customer.email && (
                                <div className="text-xs text-muted-foreground mt-0.5">{customer.email}</div>
                              )}
                            </button>
                          ))}
                          {customerMatches.length > 8 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                              +{customerMatches.length - 8} more results
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 space-y-2">
                          <p className="text-sm text-muted-foreground text-center">
                            No customers found for "{customerSearch}"
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              const digits = normalizePhone(customerSearch);
                              setNewCustomer({
                                name: digits.length >= 7 ? "" : customerSearch,
                                phone: digits.length >= 7 ? customerSearch : "",
                                email: "",
                                address: "",
                              });
                              setIsCreateCustomerOpen(true);
                            }}
                          >
                            + Create new customer
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Item Search and Category Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="pl-9"
              />
              {itemSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setItemSearch("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {/* Category tabs */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
              {(itemSearch || selectedCategory !== "All") && (
                <button
                  onClick={() => {
                    setItemSearch("");
                    setSelectedCategory("All");
                  }}
                  className="px-3.5 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto flex-1">
            {isLoadingItems ? (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                Loading items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                <p>No items found{itemSearch && ` for "${itemSearch}"`}</p>
                {itemSearch && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setItemSearch("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item._id}
                  onClick={() => addToCart(item)}
                  className="bg-card border border-border rounded-lg p-4 text-left hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className="text-2xl mb-2">
                    {item.icon || getItemIcon(item.name, item.category)}
                  </div>
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.name}
                  </div>
                  <div className="text-lg font-extrabold text-accent mt-1">
                    ${item.price.toFixed(2)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <Card className="w-[340px] shrink-0 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-accent" />
              <h2 className="font-bold text-foreground">Order Summary</h2>
              <Badge variant="outline" className="ml-auto">{cart.length} items</Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tap items to add them to the order
              </p>
            ) : (
              cart.map((item) => (
                <div key={item._id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ${item.price.toFixed(2)} × {item.qty}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item._id, -1)}
                        className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-semibold w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item._id, 1)}
                        className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.pieces} pcs × {item.qty} = {item.pieces * item.qty} total pcs</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Pieces</span>
              <span className="font-semibold">{totalPieces}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Total</span>
              <span className="text-xl font-extrabold text-foreground">${total.toFixed(2)}</span>
            </div>
            <Button 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold" 
              disabled={cart.length === 0 || isSubmitting}
              onClick={handlePlaceOrder}
            >
              {isSubmitting ? "Placing Order..." : "Place Order"}
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={isCreateCustomerOpen} onOpenChange={setIsCreateCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              No customer was found with this phone number. Enter customer details to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email (optional)</Label>
              <Input
                id="customer-email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-address">Address (optional)</Label>
              <Input
                id="customer-address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateCustomerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer} disabled={isCreatingCustomer}>
              {isCreatingCustomer ? "Saving..." : "Save Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewOrderPage;
