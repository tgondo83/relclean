import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Phone, Mail, MoreHorizontal, RefreshCw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Customer {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrders?: number;
  totalSpent?: number;
}

const CustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await api.getCustomers();
      if (error) {
        console.error("Failed to fetch customers:", error);
        return;
      }
      const response = data as { customers?: Customer[] } | undefined;
      if (response?.customers) {
        setCustomers(response.customers);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const normalizePhone = (value: string) => value.replace(/\D/g, "");

  // Score-based search for better relevance
  const searchCustomers = useCallback((query: string) => {
    if (!query.trim()) {
      return customers;
    }

    const lowerQuery = query.toLowerCase().trim();
    const queryDigits = normalizePhone(query);

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

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!value.trim()) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(() => {
      setIsSearching(false);
    }, 150);
  }, []);

  // Memoized filtered results
  const filteredCustomers = useMemo(() => {
    return searchCustomers(searchQuery);
  }, [searchCustomers, searchQuery]);

  const handleDeleteCustomer = async (customer: Customer) => {
    const confirmed = window.confirm(`Delete customer "${customer.name}"? This cannot be undone.`);
    if (!confirmed) return;

    const customerId = customer._id || customer.id;
    if (!customerId) return;

    try {
      const { error } = await api.deleteCustomer(customerId);
      if (error) {
        alert("Failed to delete customer: " + error);
        return;
      }
      setCustomers((prev) => prev.filter((c) => (c._id || c.id) !== customerId));
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Failed to delete customer. Please try again.");
    }
  };

  return (
    <>
      <AppHeader title="Customers" />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              className="pl-9 pr-9"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearching(false);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            {isSearching && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchCustomers}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => navigate("/customers/add")}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Customer
            </Button>
          </div>
        </div>

        {/* Search results summary */}
        {searchQuery && !isLoading && (
          <div className="text-sm text-muted-foreground">
            {filteredCustomers.length === 0 ? (
              <span>No customers found for "{searchQuery}"</span>
            ) : (
              <span>
                Found {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} 
                {filteredCustomers.length !== customers.length && ` (of ${customers.length} total)`}
              </span>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {searchQuery ? `No customers match "${searchQuery}"` : 'No customers yet'}
            </p>
            {searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/customers/add")}
              >
                Add your first customer
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((c, i) => (
              <Card key={c._id || c.id} className="hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold text-foreground truncate">{c.name}</div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3 shrink-0" /> 
                        <span className="truncate">{c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3 shrink-0" /> 
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/orders?customer=${encodeURIComponent(c.name)}`)}>
                          View Orders
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteCustomer(c)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {c.totalOrders ?? 0} orders
                    </span>
                    {(c.totalSpent ?? 0) > 0 && (
                      <span className="text-xs font-medium text-foreground">
                        ${(c.totalSpent ?? 0).toFixed(2)} spent
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default CustomersPage;
