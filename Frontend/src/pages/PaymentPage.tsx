import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, Plus, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { printReceipt } from "@/lib/printReceipt";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageTitle } from "@/hooks/usePageTitle";

interface OrderItem {
  name: string;
  price: number;
  qty: number;
  pieces: number;
}

interface OrderData {
  id?: string;
  orderNumber: string;
  branchId: string;
  branchPrefix: string;
  customer: string;
  items: (string | OrderItem)[];
  totalPieces?: number;
  total: number;
  status: string;
  paidAmount?: number;
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  notes?: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
}

interface ExistingPayment {
  id: string;
  paymentNumber: string;
  amount: number;
  originalAmount: number;
  currency: string;
  method: string;
  date: string;
}

interface PaymentRouteState {
  order?: OrderData;
  orderId?: string;
  customerId?: string;
  customerPhone?: string;
  isNewOrder?: boolean;
  pendingOrderData?: any;
}

const PaymentPage = () => {
  usePageTitle("Payment");
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState("USD");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [existingPayments, setExistingPayments] = useState<ExistingPayment[]>([]);
  const [priorPaidAmount, setPriorPaidAmount] = useState(0);
  const [zwlRate, setZwlRate] = useState<number>(1);

  const state = (location.state as PaymentRouteState | null) || null;
  const isNewOrder = state?.isNewOrder ?? false;
  const pendingOrderData = state?.pendingOrderData;
  const customerPhone = state?.customerPhone || "";

  // Fetch latest exchange rate from database
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const { data } = await api.getCurrentExchangeRate();
        if (data && data.rate) {
          setZwlRate(data.rate);
        }
      } catch (err) {
        console.error('Failed to fetch exchange rate:', err);
      }
    };
    fetchRate();
  }, []);

  const orderIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("orderId") || undefined;
  }, [location.search]);

  const [createdOrderId, setCreatedOrderId] = useState<string | undefined>(undefined);
  const orderId = createdOrderId || state?.orderId || state?.order?.id || orderIdFromQuery;

  useEffect(() => {
    setCustomerId(state?.customerId);
    if (state?.order) setOrder(state.order);
  }, [state]);

  useEffect(() => {
    if (customerId || !orderId) return;
    try {
      const saved = localStorage.getItem(`order_customer_${orderId}`) || undefined;
      if (saved) setCustomerId(saved);
    } catch (storageError) {
      console.warn("Failed to read customer mapping:", storageError);
    }
  }, [customerId, orderId]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (order || !orderId) return;

      setIsLoadingOrder(true);
      try {
        const { data, error } = await api.getOrder(orderId);
        if (error) {
          console.error("Failed to fetch order:", error);
          return;
        }

        const raw = data as any;
        const mapped: OrderData = {
          id: raw?._id || raw?.id || orderId,
          orderNumber: raw?.orderNumber || orderId,
          branchId: raw?.branchId,
          branchPrefix: raw?.branchPrefix,
          customer: raw?.customer || "",
          items: Array.isArray(raw?.items) ? raw.items : [],
          totalPieces: typeof raw?.totalPieces === "number" ? raw.totalPieces : 0,
          total: typeof raw?.total === "number" ? raw.total : 0,
          status: raw?.status || "pending",
          paidAmount: raw?.paidAmount || 0,
          paymentStatus: raw?.paymentStatus || "unpaid",
        };
        setOrder(mapped);
        setPriorPaidAmount(mapped.paidAmount || 0);
      } finally {
        setIsLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [order, orderId]);

  // Load existing payments for partial payment tracking
  useEffect(() => {
    const fetchExistingPayments = async () => {
      if (!orderId) return;
      
      try {
        const { data } = await api.getPaymentSummary(orderId);
        if (data) {
          const summary = data as any;
          setPriorPaidAmount(summary.totalPaid || 0);
          setExistingPayments(
            (summary.payments || []).map((p: any) => ({
              id: p.id,
              paymentNumber: p.paymentNumber,
              amount: p.amount,
              originalAmount: p.originalAmount || p.amount,
              currency: p.currency || 'USD',
              method: p.method,
              date: p.date,
            }))
          );
        }
      } catch (error) {
        console.error("Failed to fetch payment summary:", error);
      }
    };

    fetchExistingPayments();
  }, [orderId]);

  const orderData = order;

  if (!orderData) {
    return (
      <>
        <AppHeader title="Payment" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-muted-foreground">
                {isLoadingOrder ? "Loading order..." : "No order data found"}
              </p>
              <Button onClick={() => navigate("/orders/new")}>Back to New Order</Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const paymentMethods = [
    { id: "cash", name: "Cash", icon: "💵" },
    { id: "card", name: "Card", icon: "💳" },
    { id: "mobile", name: "Mobile", icon: "📱" },
    { id: "bank", name: "Bank", icon: "🏦" },
  ];

  const currencies = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "ZWL", symbol: "Z$", name: "Zimbabwean Dollar" },
  ];

  const getExchangeRate = (currency: string) => {
    if (currency === 'ZWL') return zwlRate;
    return 1;
  };

  const getCurrencySymbol = (currency: string) => {
    return currencies.find((c) => c.code === currency)?.symbol || "$";
  };

  // Calculate total paid in current session (USD)
  const sessionPaidUSD = payments.reduce((sum, payment) => {
    const amountInUSD = payment.amount / getExchangeRate(payment.currency);
    return sum + amountInUSD;
  }, 0);

  // Total paid including prior payments
  const totalPaidUSD = priorPaidAmount + sessionPaidUSD;

  // Calculate balance in USD
  const balanceUSD = orderData.total - totalPaidUSD;

  // Calculate balance in all currencies
  const getBalanceInCurrency = (currency: string) => {
    return Math.max(0, balanceUSD * getExchangeRate(currency));
  };

  const isPaid = balanceUSD <= 0.01; // Allow small rounding tolerance
  // Show partial payment button whenever there are session payments that don't cover the full balance
  const isPartialPayment = payments.length > 0 && !isPaid;

  const handleAddPayment = (amount?: number) => {
    const payAmount = typeof amount === 'number' ? amount : parseFloat(cashReceived);
    if (!payAmount || payAmount <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }
    if (!selectedPayment) {
      alert("Please select a payment method");
      return;
    }
    const newPayment: Payment = {
      id: Date.now().toString(),
      amount: payAmount,
      currency: paymentCurrency,
      method: selectedPayment,
    };
    setPayments((prev) => [...prev, newPayment]);
    setPaymentAmount("");
    setCashReceived("");
  };

  const handleRemovePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  // Helper: create the order in DB if this is a new (unsaved) order
  const ensureOrderCreated = async (): Promise<string | undefined> => {
    // Already saved — return existing ID
    if (orderId && !isNewOrder) return orderId;
    if (createdOrderId) return createdOrderId;

    if (!pendingOrderData) {
      alert("Order data is missing. Please go back and create a new order.");
      return undefined;
    }

    const { data, error } = await api.createOrder(pendingOrderData);
    if (error) {
      alert("Failed to create order: " + error);
      return undefined;
    }

    const newId =
      (data as any)?._id ||
      (data as any)?.id ||
      (data as any)?.orderNumber;

    if (newId) {
      setCreatedOrderId(newId);

      // Persist customer mapping
      if (customerId) {
        try {
          localStorage.setItem(`order_customer_${newId}`, customerId);
        } catch { /* ignore */ }
      }

      // Update local order data with the server-generated orderNumber
      const serverOrderNumber = (data as any)?.orderNumber || newId;
      setOrder((prev) =>
        prev ? { ...prev, id: newId, orderNumber: serverOrderNumber } : prev
      );
    }

    return newId;
  };

  const toBackendPaymentMethod = (method: string): string => {
    switch (method) {
      case "cash":
        return "cash";
      case "card":
        return "card";
      case "mobile":
        return "mobile_money";
      case "bank":
        return "bank_transfer";
      case "cheque":
        return "bank_transfer";
      default:
        return "cash";
    }
  };

  // Resolve customer phone for receipt
  const resolveCustomerPhone = async (): Promise<string> => {
    if (customerPhone) return customerPhone;
    let phone = "";
    try {
      let resolvedCustomerId = customerId;
      if (!resolvedCustomerId && orderData?.customer) {
        const { data: custData } = await api.getCustomers();
        const customers = (custData as { customers?: { _id: string; name: string }[] })?.customers || [];
        const match = customers.find(
          (c) => c.name.toLowerCase() === orderData.customer.toLowerCase()
        );
        if (match) resolvedCustomerId = match._id;
      }
      if (resolvedCustomerId) {
        const { data: custDetail } = await api.getCustomer(resolvedCustomerId);
        phone = (custDetail as { phone?: string })?.phone || "";
      }
      if (!phone && orderData?.customer) {
        const { data: custData } = await api.getCustomers();
        const allCusts = (custData as { customers?: { name: string; phone: string }[] })?.customers || [];
        const found = allCusts.find((c) => c.name.toLowerCase() === orderData.customer.toLowerCase());
        if (found) phone = found.phone;
      }
    } catch { /* non-critical */ }
    return phone;
  };

  const handleRecordPayments = async (isPartial: boolean = false) => {
    if (payments.length === 0) {
      alert("No payments to record");
      return;
    }

    if (!isPartial && !isPaid) {
      alert("Full payment amount not received yet. Use 'Save Partial Payment' to record partial payments.");
      return;
    }

    setIsProcessing(true);
    try {
      // Ensure order exists in DB first
      const resolvedOrderId = await ensureOrderCreated();
      if (!resolvedOrderId) return;

      // Try to resolve customerId
      let resolvedCustomerId = customerId;
      if (!resolvedCustomerId && orderData?.customer) {
        try {
          const { data: custData } = await api.getCustomers();
          const customers = (custData as { customers?: { _id: string; name: string }[] })?.customers || [];
          const match = customers.find(
            (c) => c.name.toLowerCase() === orderData.customer.toLowerCase()
          );
          if (match) {
            resolvedCustomerId = match._id;
            setCustomerId(match._id);
          }
        } catch (lookupError) {
          console.warn("Customer lookup failed:", lookupError);
        }
      }

      // Persist each received payment with currency tracking for split payments
      for (const payment of payments) {
        const exchangeRate = getExchangeRate(payment.currency);
        const amountUSD = payment.amount / exchangeRate;

        const { error } = await api.createPayment({
          orderId: resolvedOrderId,
          customerId: resolvedCustomerId,
          amount: amountUSD,
          originalAmount: payment.amount,
          currency: payment.currency,
          exchangeRate: exchangeRate,
          paymentMethod: toBackendPaymentMethod(payment.method),
          paymentStatus: "completed",
          notes: `Captured ${payment.amount.toFixed(2)} ${payment.currency} via ${payment.method}`,
        });

        if (error) {
          alert("Payment recording failed: " + error);
          return;
        }
      }

      // Update order payment status tracking
      const newTotalPaid = priorPaidAmount + sessionPaidUSD;
      const isNowFullyPaid = newTotalPaid >= orderData.total - 0.01;

      const paymentSummary = payments
        .map((p) => `${getCurrencySymbol(p.currency)}${p.amount.toFixed(2)} (${p.currency})`)
        .join(" + ");

      if (isNowFullyPaid) {
        alert(
          `Payment completed!\nTotal: ${paymentSummary}\nOrder ${orderData.orderNumber} is now fully paid!`
        );
      } else {
        const remainingBalance = orderData.total - newTotalPaid;
        alert(
          `Partial payment recorded!\nPaid: ${paymentSummary}\nRemaining balance: $${remainingBalance.toFixed(2)}`
        );
      }

      const resolvedPhone = await resolveCustomerPhone();

      // Print receipt after recording payments
      printReceipt({
        orderNumber: orderData.orderNumber,
        id: resolvedOrderId,
        customer: orderData.customer,
        customerPhone: resolvedPhone,
        status: orderData.status,
        items: orderData.items,
        totalPieces: orderData.totalPieces,
        total: orderData.total,
        paidAmount: newTotalPaid,
        paymentStatus: isNowFullyPaid ? "paid" : "partial",
        paymentMethod: [...new Set(payments.map(p => p.method))],
        paymentDetails: payments.map(p => ({
          method: p.method,
          currency: p.currency,
          originalAmount: p.amount,
        })),
      });

      navigate("/orders");
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Complete & print: creates order if needed, records any staged payments, prints receipt
  const handleCompletePayment = async () => {
    // If there are payments staged and fully paid, record them via existing flow
    if (payments.length > 0 && isPaid) {
      handleRecordPayments(false);
      return;
    }

    setIsProcessing(true);
    try {
      // Ensure order exists in DB first
      const resolvedOrderId = await ensureOrderCreated();
      if (!resolvedOrderId) return;

      // If there are staged partial payments, record them before printing
      if (payments.length > 0) {
        let resolvedCustomerId = customerId;
        if (!resolvedCustomerId && orderData?.customer) {
          try {
            const { data: custData } = await api.getCustomers();
            const customers = (custData as { customers?: { _id: string; name: string }[] })?.customers || [];
            const match = customers.find(
              (c) => c.name.toLowerCase() === orderData.customer.toLowerCase()
            );
            if (match) {
              resolvedCustomerId = match._id;
              setCustomerId(match._id);
            }
          } catch { /* ignore */ }
        }

        for (const payment of payments) {
          const exchangeRate = getExchangeRate(payment.currency);
          const amountUSD = payment.amount / exchangeRate;
          await api.createPayment({
            orderId: resolvedOrderId,
            customerId: resolvedCustomerId,
            amount: amountUSD,
            originalAmount: payment.amount,
            currency: payment.currency,
            exchangeRate: exchangeRate,
            paymentMethod: toBackendPaymentMethod(payment.method),
            paymentStatus: "completed",
            notes: `Captured ${payment.amount.toFixed(2)} ${payment.currency} via ${payment.method}`,
          });
        }
      }

      const resolvedPhone = await resolveCustomerPhone();

      const currentTotalPaid = totalPaidUSD;
      const currentPaymentStatus: string =
        currentTotalPaid >= orderData.total - 0.01 ? "paid" : currentTotalPaid > 0 ? "partial" : "unpaid";

      const activePayments = payments.length > 0 ? payments : existingPayments.map(p => ({
        id: p.id,
        amount: p.originalAmount,
        currency: p.currency,
        method: p.method,
      }));
      printReceipt({
        orderNumber: orderData.orderNumber,
        id: resolvedOrderId,
        customer: orderData.customer,
        customerPhone: resolvedPhone,
        status: orderData.status,
        items: orderData.items,
        totalPieces: orderData.totalPieces,
        total: orderData.total,
        paidAmount: currentTotalPaid,
        paymentStatus: currentPaymentStatus,
        paymentMethod: [...new Set(activePayments.map(p => p.method))],
        paymentDetails: activePayments.map(p => ({
          method: p.method,
          currency: p.currency,
          originalAmount: p.amount,
        })),
      });

      navigate("/orders");
    } catch (error) {
      console.error("Complete & print error:", error);
      alert("Failed to complete order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handler for partial payment
  const handlePartialPayment = () => handleRecordPayments(true);

  return (
    <>
      <AppHeader title="Payment" />
      <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto">
        {/* Order Summary */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-semibold text-lg">{orderData.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{orderData.customer}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground mb-2">Items</p>
              <div className="space-y-1">
                {orderData.items.map((item, index) => {
                  if (typeof item === 'string') {
                    return (
                      <div key={index} className="text-sm text-foreground">
                        • {item}
                      </div>
                    );
                  }
                  return (
                    <div key={index} className="flex justify-between text-sm text-foreground">
                      <span>• {item.name} × {item.qty}</span>
                      <span className="text-muted-foreground">{item.pieces * item.qty} pcs</span>
                    </div>
                  );
                })}
              </div>
              {orderData.totalPieces && orderData.totalPieces > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50 flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Pieces</span>
                  <span className="font-semibold">{orderData.totalPieces}</span>
                </div>
              )}
              {orderData.notes && (
                <div className="mt-4 p-3 rounded bg-muted/50 border border-border">
                  <span className="block text-xs text-muted-foreground mb-1 font-semibold">Order Notes:</span>
                  <span className="text-sm text-foreground whitespace-pre-line">{orderData.notes}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total Amount</span>
                <span className="text-xl font-bold">${orderData.total.toFixed(2)}</span>
              </div>
              {priorPaidAmount > 0 && (
                <div className="flex items-center justify-between text-success">
                  <span className="text-sm">Previously Paid</span>
                  <span className="font-semibold">-${priorPaidAmount.toFixed(2)}</span>
                </div>
              )}
              {sessionPaidUSD > 0 && (
                <div className="flex items-center justify-between text-primary">
                  <span className="text-sm">This Session</span>
                  <span className="font-semibold">-${sessionPaidUSD.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-lg font-semibold">Balance Due</span>
                <span className={`text-2xl font-bold ${balanceUSD <= 0.01 ? 'text-success' : 'text-accent'}`}>
                  ${Math.max(0, balanceUSD).toFixed(2)}
                </span>
              </div>
              {orderData.paymentStatus === 'partial' && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  Partial Payment
                </Badge>
              )}
            </div>

            {/* Existing Payments */}
            {existingPayments.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-2">Previous Payments</p>
                <div className="space-y-2">
                  {existingPayments.map((ep) => (
                    <div key={ep.id} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                      <div>
                        <span className="font-medium">{ep.paymentNumber}</span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(ep.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">
                          {getCurrencySymbol(ep.currency)}{ep.originalAmount.toFixed(2)} {ep.currency}
                        </span>
                        {ep.currency !== 'USD' && (
                          <span className="text-muted-foreground ml-1">(${ep.amount.toFixed(2)})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Payment Methods and Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Entry */}
            <Card className="animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Record Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payment Method Selection - Compact */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="flex gap-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPayment(method.id)}
                        className={`flex-1 px-3 py-2 rounded-md border transition-all text-center ${
                          selectedPayment === method.id
                            ? "border-accent bg-accent/10 text-accent-foreground"
                            : "border-border bg-card hover:border-accent/50"
                        }`}
                      >
                        <span className="text-sm">{method.icon}</span>
                        <span className="text-sm font-medium ml-1">{method.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-2">
                    <Label htmlFor="amount">Amount Tendered</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount tendered (e.g. 20.00)"
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} ({currency.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Change</Label>
                    <div className="w-full min-h-[36px] flex items-center rounded border border-border bg-background px-2 text-sm">
                      {cashReceived && parseFloat(cashReceived) > 0 ? (
                        (() => {
                          const tendered = parseFloat(cashReceived);
                          const balanceDue = Math.max(0, balanceUSD);
                          const totalDue = paymentCurrency === "ZWL"
                            ? balanceDue * getExchangeRate("ZWL")
                            : balanceDue;
                          const change = tendered - totalDue;
                          if (change >= 0) {
                            return (
                              <span className="text-success font-bold">
                                {getCurrencySymbol(paymentCurrency)}{change.toFixed(2)}
                              </span>
                            );
                          } else {
                            return <span className="text-destructive">No change</span>;
                          }
                        })()
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        handleAddPayment();
                      }}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
                      disabled={!cashReceived || !selectedPayment || isProcessing}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {paymentAmount && (
                  <div className="text-xs text-muted-foreground">
                    {currencies
                      .filter((c) => c.code !== paymentCurrency)
                      .map((currency) => {
                        const convertedAmount =
                          (parseFloat(paymentAmount) * getExchangeRate(paymentCurrency)) /
                          getExchangeRate(currency.code);
                        return (
                          <span key={currency.code}>
                            ≈ {currency.symbol}{convertedAmount.toFixed(2)} {currency.code}
                          </span>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payments List */}
            {payments.length > 0 && (
              <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
                <CardHeader>
                  <CardTitle className="text-lg">Payments Received</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">
                          {getCurrencySymbol(payment.currency)}
                          {payment.amount.toFixed(2)} {payment.currency}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {paymentMethods.find((m) => m.id === payment.method)?.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePayment(payment.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Balance Summary */}
          <div className="space-y-6">
            {/* Amount Paid */}
            <Card className="animate-fade-in bg-success/5 border-success/20" style={{ animationDelay: "100ms" }}>
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-3xl font-bold text-success mt-2">
                  ${totalPaidUSD.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            {/* Balance Due */}
            <Card className={`animate-fade-in ${isPaid ? 'bg-success/5 border-success/20' : 'bg-accent/5 border-accent/20'}`} style={{ animationDelay: "200ms" }}>
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground">Balance Due</p>
                <p className={`text-3xl font-bold mt-2 ${isPaid ? 'text-success' : 'text-accent'}`}>
                  ${balanceUSD.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            {/* Balance in All Currencies */}
            <Card className="animate-fade-in" style={{ animationDelay: "300ms" }}>
              <CardHeader>
                <CardTitle className="text-sm">Balance in All Currencies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currencies.map((currency) => (
                  <div key={currency.code} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">{currency.code}</p>
                      <p className="text-sm font-medium">
                        {currency.symbol}
                        {getBalanceInCurrency(currency.code).toFixed(2)}
                      </p>
                    </div>
                    {getBalanceInCurrency(currency.code) <= 0 && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                        Paid
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/orders/new")}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Order
          </Button>
          {isPartialPayment && (
            <Button
              variant="outline"
              onClick={handlePartialPayment}
              disabled={payments.length === 0 || isProcessing}
              className="flex-1 border-warning text-warning hover:bg-warning/10"
            >
              {isProcessing ? "Processing..." : "Save Partial Payment"}
            </Button>
          )}
          <Button
            onClick={handleCompletePayment}
            disabled={isProcessing}
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isProcessing ? "Processing..." : "Complete & Print Receipt"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default PaymentPage;
