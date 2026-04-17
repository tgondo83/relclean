import { LOGO_KEY } from "@/hooks/useLogo";

export interface ReceiptPaymentDetail {
  method: string;
  currency: string;
  originalAmount?: number;
}

export interface ReceiptOrder {
  orderNumber?: string;
  id?: string;
  customer: string;
  customerPhone?: string;
  status: string;
  date?: string;
  items: (string | { name: string; price: number; qty: number; pieces: number })[];
  totalPieces?: number;
  total: number;
  paidAmount?: number;
  paymentStatus?: string;
  paymentMethod?: string | string[];
  paymentDetails?: ReceiptPaymentDetail[];
}

interface ReceiptSettings {
  headerLine1: string;
  headerLine2: string;
  headerLine3: string;
  footerLine1: string;
  footerLine2: string;
  footerLine3: string;
}

const defaultReceipt: ReceiptSettings = {
  headerLine1: "",
  headerLine2: "Dry Cleaning & Laundry Services",
  headerLine3: "",
  footerLine1: "Thank you for your business!",
  footerLine2: "Items not collected after 30 days will be donated.",
  footerLine3: "",
};

function formatReceiptDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
}

/**
 * Opens a print window with a receipt optimised for the EPSON TM-T88 (80 mm).
 */
export function printReceipt(order: ReceiptOrder): void {
  // Load receipt settings from localStorage
  let receipt: ReceiptSettings = { ...defaultReceipt };
  try {
    const stored = localStorage.getItem("receiptSettings");
    if (stored) receipt = { ...receipt, ...JSON.parse(stored) };
  } catch {
    // ignore
  }

  // Load logo
  const logo = localStorage.getItem(LOGO_KEY) || "";

  const paid = order.paidAmount ?? 0;
  const balance = Math.max(0, order.total - paid);

  const printWindow = window.open("", "_blank", "width=350,height=600");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html><html><head>
    <title>Receipt</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 80mm; }
      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        line-height: 1.3;
        padding: 4mm 3mm;
        color: #000;
        -webkit-print-color-adjust: exact;
      }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .logo { display: block; margin: 0 auto 4px; max-width: 50mm; max-height: 18mm; }
      .header { margin-bottom: 6px; text-align: center; }
      .header .name { font-size: 16px; font-weight: bold; }
      .header .sub { font-size: 11px; }
      .sep { border-top: 1px dashed #000; margin: 4px 0; }
      .dbl-sep { border-top: 2px solid #000; margin: 4px 0; }
      .row { display: flex; justify-content: space-between; }
      .row .val { text-align: right; font-weight: bold; }
      .items { margin: 2px 0; }
      .item { display: flex; justify-content: space-between; font-size: 11px; }
      .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin: 2px 0; }
      .footer { margin-top: 6px; text-align: center; font-size: 10px; }
      .cut { margin-top: 8px; border-top: 1px dashed #000; }
    </style>
  </head><body>
    ${logo ? `<img class="logo" src="${logo}" />` : ""}
    <div class="header">
      <div class="name">${receipt.headerLine1 || "RelClean"}</div>
      ${receipt.headerLine2 ? `<div class="sub">${receipt.headerLine2}</div>` : ""}
      ${receipt.headerLine3 ? `<div class="sub">${receipt.headerLine3}</div>` : ""}
    </div>
    <div class="dbl-sep"></div>
    <div class="center bold" style="font-size:13px;">RECEIPT</div>
    <div class="sep"></div>
    <div class="row"><span>Order #:</span><span class="val">${order.orderNumber || order.id || "-"}</span></div>
    <div class="row"><span>Date:</span><span>${formatReceiptDate(order.date)}</span></div>
    <div class="row"><span>Customer:</span><span>${order.customer}</span></div>
    ${order.customerPhone ? `<div class="row"><span>Phone:</span><span>${order.customerPhone}</span></div>` : ""}
    <div class="row"><span>Status:</span><span>${order.status.toUpperCase()}</span></div>
    <div class="sep"></div>
    <div class="items">
      ${order.items.map((item) => {
        if (typeof item === "string") return `<div class="item"><span>${item}</span><span></span></div>`;
        const pcs = item.pieces * item.qty;
        return `<div class="item"><span>${item.name} x${item.qty} (${pcs}pc)</span><span>$${(item.price * item.qty).toFixed(2)}</span></div>`;
      }).join("")}
    </div>
    <div class="sep"></div>
    <div class="row"><span>Total Pieces:</span><span class="val">${(() => {
      if (order.totalPieces && order.totalPieces > 0) return order.totalPieces;
      // Fall back to summing from items
      const calc = order.items.reduce((sum, item) => {
        if (typeof item === "string") return sum;
        return sum + (item.pieces * item.qty);
      }, 0);
      return calc > 0 ? calc : "-";
    })()}</span></div>
    <div class="dbl-sep"></div>
    <div class="total-row"><span>TOTAL:</span><span>$${order.total.toFixed(2)} USD</span></div>
    ${(() => {
      if (order.paymentDetails && order.paymentDetails.length > 0) {
        // Show each payment line with method, amount and currency
        const payLines = order.paymentDetails.map((d) => {
          const methodLabel = d.method.charAt(0).toUpperCase() + d.method.slice(1);
          const sym = d.currency === "ZWL" ? "Z$" : "$";
          const amtStr = d.originalAmount !== undefined
            ? `${sym}${d.originalAmount.toFixed(2)} ${d.currency}`
            : d.currency;
          return `<div class="row"><span>${methodLabel}:</span><span class="val">${amtStr}</span></div>`;
        });
        // USD equivalent total if any non-USD payment
        const hasNonUSD = order.paymentDetails.some(d => d.currency !== "USD");
        const usdLine = hasNonUSD
          ? `<div class="row" style="font-size:10px;color:#555;"><span>Paid (USD equiv.):</span><span>$${paid.toFixed(2)}</span></div>`
          : `<div class="row"><span>Paid:</span><span>$${paid.toFixed(2)} USD</span></div>`;
        return payLines.join("") + usdLine;
      }
      return `<div class="row"><span>Paid:</span><span>$${paid.toFixed(2)} USD</span></div>`;
    })()}
    ${balance > 0.01 ? `<div class="row" style="font-weight:bold;"><span>Balance Due:</span><span class="val">$${balance.toFixed(2)} USD</span></div>` : ""}
    <div class="row"><span>Status:</span><span>${(order.paymentStatus || "unpaid").toUpperCase()}</span></div>
    <div class="dbl-sep"></div>
    <div class="footer">
      ${receipt.footerLine1 ? `<div>${receipt.footerLine1}</div>` : ""}
      ${receipt.footerLine2 ? `<div>${receipt.footerLine2}</div>` : ""}
      ${receipt.footerLine3 ? `<div>${receipt.footerLine3}</div>` : ""}
    </div>
    <div class="cut"></div>
    <script>window.onload=function(){window.print();window.close();}<\/script>
  </body></html>`);
  printWindow.document.close();
}

/**
 * Data shape expected by the daily-overview thermal print.
 */
export interface DailyOverviewPrintData {
  totalOrders: number;
  totalPieces: number;
  totalRevenue: number;
  unpaidAmount: number;
  ordersByStatus: { status: string; count: number }[];
  revenueByPaymentMethod: { method: string; amount: number; count: number }[];
  revenueByCurrency: { currency: string; symbol: string; originalAmount: number; usdAmount: number; count: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
}

/**
 * Opens a print window with the Day's Overview formatted for the
 * EPSON TM-T88V thermal receipt printer (80 mm paper).
 */
export function printDailyOverview(
  data: DailyOverviewPrintData,
  branchName?: string,
  selectedDate?: string,
): void {
  // Load receipt header/footer from localStorage
  let receipt: ReceiptSettings = { ...defaultReceipt };
  try {
    const stored = localStorage.getItem("receiptSettings");
    if (stored) receipt = { ...receipt, ...JSON.parse(stored) };
  } catch { /* ignore */ }

  const logo = localStorage.getItem(LOGO_KEY) || "";
  const now = new Date();
  const reportDate = selectedDate ? new Date(selectedDate + "T00:00:00") : now;
  const dateStr = reportDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString();

  // Helper: right-pad label, left-pad value to fill a 40-char line
  const line = (label: string, value: string) =>
    `<div class="row"><span>${label}</span><span class="val">${value}</span></div>`;

  // Build sections
  let statusRows = "";
  if (data.ordersByStatus.length) {
    statusRows = `<div class="sep"></div>
      <div class="center bold">ORDERS BY STATUS</div>
      <div class="sep"></div>
      ${data.ordersByStatus.map(s => line(s.status, String(s.count))).join("")}`;
  }

  let payMethodRows = "";
  if (data.revenueByPaymentMethod.length) {
    payMethodRows = `<div class="sep"></div>
      <div class="center bold">REVENUE BY PAYMENT METHOD</div>
      <div class="sep"></div>
      <div class="tbl-head"><span>Method</span><span>USD</span><span>#</span></div>
      ${data.revenueByPaymentMethod.map(m =>
        `<div class="tbl-row"><span>${m.method}</span><span>$${m.amount.toFixed(2)}</span><span>${m.count}</span></div>`
      ).join("")}`;
  }

  let currencyRows = "";
  if (data.revenueByCurrency.length) {
    currencyRows = `<div class="sep"></div>
      <div class="center bold">REVENUE BY CURRENCY</div>
      <div class="sep"></div>
      <div class="tbl-head"><span>Curr</span><span>Amt</span><span>USD</span><span>#</span></div>
      ${data.revenueByCurrency.map(c =>
        `<div class="tbl-row4"><span>${c.currency}</span><span>${c.symbol}${c.originalAmount.toFixed(2)}</span><span>$${c.usdAmount.toFixed(2)}</span><span>${c.count}</span></div>`
      ).join("")}`;
  }

  let topItemRows = "";


  const printWindow = window.open("", "_blank", "width=350,height=700");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html><html><head>
    <title>Day's Overview</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 80mm; }
      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        line-height: 1.3;
        padding: 4mm 3mm;
        color: #000;
        -webkit-print-color-adjust: exact;
      }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .logo { display: block; margin: 0 auto 4px; max-width: 50mm; max-height: 18mm; }
      .header { margin-bottom: 6px; text-align: center; }
      .header .name { font-size: 16px; font-weight: bold; }
      .header .sub { font-size: 11px; }
      .sep { border-top: 1px dashed #000; margin: 4px 0; }
      .dbl-sep { border-top: 2px solid #000; margin: 4px 0; }
      .row { display: flex; justify-content: space-between; }
      .row .val { text-align: right; font-weight: bold; }
      .big-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin: 2px 0; }
      .tbl-head { display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 2px; }
      .tbl-head span { flex: 1; }
      .tbl-head span:not(:first-child) { text-align: right; }
      .tbl-row { display: flex; justify-content: space-between; font-size: 11px; }
      .tbl-row span { flex: 1; }
      .tbl-row span:not(:first-child) { text-align: right; }
      .tbl-row4 { display: flex; justify-content: space-between; font-size: 10px; }
      .tbl-row4 span { flex: 1; }
      .tbl-row4 span:not(:first-child) { text-align: right; }
      .footer { margin-top: 6px; text-align: center; font-size: 10px; }
      .cut { margin-top: 8px; border-top: 1px dashed #000; }
    </style>
  </head><body>
    ${logo ? `<img class="logo" src="${logo}" />` : ""}
    <div class="header">
      <div class="name">${receipt.headerLine1 || "RelClean"}</div>
      ${receipt.headerLine2 ? `<div class="sub">${receipt.headerLine2}</div>` : ""}
      ${receipt.headerLine3 ? `<div class="sub">${receipt.headerLine3}</div>` : ""}
    </div>
    <div class="dbl-sep"></div>
    <div class="center bold" style="font-size:13px;">DAY'S OVERVIEW</div>
    <div class="sep"></div>
    ${line("Date:", dateStr)}
    ${line("Time:", timeStr)}
    ${branchName ? line("Branch:", branchName) : ""}
    <div class="dbl-sep"></div>
    <div class="big-row"><span>ORDERS:</span><span>${data.totalOrders}</span></div>
    <div class="big-row"><span>PIECES:</span><span>${data.totalPieces}</span></div>
    <div class="big-row"><span>REVENUE:</span><span>$${data.totalRevenue.toFixed(2)}</span></div>
    <div class="big-row" style="color:#000;"><span>UNPAID:</span><span>$${data.unpaidAmount.toFixed(2)}</span></div>
    ${statusRows}
    ${payMethodRows}
    ${currencyRows}
    ${topItemRows}
    <div class="dbl-sep"></div>
    <div class="footer">
      ${receipt.footerLine1 ? `<div>${receipt.footerLine1}</div>` : ""}
      <div>Printed: ${now.toLocaleString()}</div>
    </div>
    <div class="cut"></div>
    <script>window.onload=function(){window.print();window.close();}<\/script>
  </body></html>`);
  printWindow.document.close();
}
