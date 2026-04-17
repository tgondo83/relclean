import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Building2, MapPin, Check, Trash2, FileText, ImagePlus, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useLogo } from "@/hooks/useLogo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePageTitle } from "@/hooks/usePageTitle";

interface CompanyDetails {
  name: string;
  address: string;
  phone: string;
}

interface ReceiptSettings {
  headerLine1: string;  // typically the company name
  headerLine2: string;  // tagline / service type
  headerLine3: string;  // optional extra (website, email, etc.)
  footerLine1: string;  // thank-you message
  footerLine2: string;  // policy note
  footerLine3: string;  // optional extra
}

const RECEIPT_STORAGE_KEY = "receiptSettings";

const defaultReceipt: ReceiptSettings = {
  headerLine1: "",
  headerLine2: "Dry Cleaning & Laundry Services",
  headerLine3: "",
  footerLine1: "Thank you for your business!",
  footerLine2: "Items not collected after 30 days will be donated.",
  footerLine3: "",
};

interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

const SettingsPage = () => {
  usePageTitle("Settings");
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    name: "RelClean Dry Cleaners",
    address: "123 Main Street, Harare",
    phone: "+263 77 000 0000",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Company logo
  const { logo, saveLogo, removeLogo } = useLogo();
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError("");
    if (!file.type.startsWith("image/")) {
      setLogoError("Please select an image file (PNG, JPG, SVG, WEBP).");
      return;
    }
    if (file.size > 500 * 1024) {
      setLogoError("Image must be smaller than 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) saveLogo(result);
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  // Receipt header / footer
  const [receipt, setReceipt] = useState<ReceiptSettings>(() => {
    try {
      const stored = localStorage.getItem(RECEIPT_STORAGE_KEY);
      return stored ? { ...defaultReceipt, ...JSON.parse(stored) } : { ...defaultReceipt };
    } catch {
      return { ...defaultReceipt };
    }
  });
  const [isReceiptSaving, setIsReceiptSaving] = useState(false);
  const [receiptSaveSuccess, setReceiptSaveSuccess] = useState(false);

  const handleReceiptChange = (field: keyof ReceiptSettings, value: string) => {
    setReceipt((p) => ({ ...p, [field]: value }));
    setReceiptSaveSuccess(false);
  };

  const handleSaveReceipt = () => {
    setIsReceiptSaving(true);
    setTimeout(() => {
      localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(receipt));
      setIsReceiptSaving(false);
      setReceiptSaveSuccess(true);
      setTimeout(() => setReceiptSaveSuccess(false), 3000);
    }, 400);
  };
  const [branches, setBranches] = useState<Branch[]>([
    { id: "1", name: "Main Branch" },
    { id: "2", name: "CBD Branch" },
    { id: "3", name: "Eastside Branch" },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState<Branch>({ id: "", name: "" });

  // Load data from localStorage and API on mount
  useEffect(() => {
    // Fetch company details from API
    const fetchCompany = async () => {
      try {
        const { data } = await api.getCompany();
        const company = data as any;
        if (company) {
          setCompanyDetails({
            name: company.name || 'RelClean Dry Cleaners',
            address: company.address || '123 Main Street, Harare',
            phone: company.phone || '+263 77 000 0000',
          });
        }
      } catch (error) {
        console.error("Failed to load company details from API:", error);
        // Fallback to localStorage
        const savedDetails = localStorage.getItem("companyDetails");
        if (savedDetails) {
          try {
            setCompanyDetails(JSON.parse(savedDetails));
          } catch (err) {
            console.error("Failed to load company details from localStorage:", err);
          }
        }
      }
    };

    fetchCompany();

    // Fetch branches from API
    const fetchBranches = async () => {
      try {
        const { data } = await api.getBranches();
        const branchData = data as any;
        if (branchData?.branches) {
          setBranches(branchData.branches as Branch[]);
        }
      } catch (error) {
        console.error("Failed to load branches from API:", error);
        // Fallback to localStorage
        const savedBranches = localStorage.getItem("branches");
        if (savedBranches) {
          try {
            setBranches(JSON.parse(savedBranches));
          } catch (err) {
            console.error("Failed to load branches from localStorage:", err);
          }
        }
      }
    };

    fetchBranches();
  }, []);

  const handleInputChange = (field: keyof CompanyDetails, value: string) => {
    setCompanyDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaveSuccess(false);
  };

  const handleSaveChanges = async () => {
    if (!companyDetails.name.trim() || !companyDetails.address.trim() || !companyDetails.phone.trim()) {
      alert("All fields are required");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await api.updateCompany(companyDetails);
      
      if (error) {
        alert("Failed to save company details: " + error);
        return;
      }

      // Save to localStorage as backup
      localStorage.setItem("companyDetails", JSON.stringify(companyDetails));
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save company details:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({ id: "", name: "" });
    setIsDialogOpen(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm(branch);
    setIsDialogOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!branchForm.name.trim()) {
      alert("Branch name is required");
      return;
    }

    try {
      if (editingBranch && editingBranch.id) {
        // Update existing branch via API
        const { data, error } = await api.updateBranch(editingBranch.id, {
          name: branchForm.name,
          address: branchForm.address,
          phone: branchForm.phone,
        });

        if (error) {
          alert("Failed to update branch: " + error);
          return;
        }

        const updatedBranches = branches.map((b) =>
          b.id === editingBranch.id ? (data as unknown as Branch) : b
        );
        setBranches(updatedBranches);
        localStorage.setItem("branches", JSON.stringify(updatedBranches));
      } else {
        // Create new branch via API
        const { data: newBranchData, error } = await api.createBranch({
          name: branchForm.name,
          address: branchForm.address,
          phone: branchForm.phone,
          prefix: branchForm.name.substring(0, 2).toUpperCase(),
        });

        if (error) {
          alert("Failed to create branch: " + error);
          return;
        }

        const created: Branch = {
          id: (newBranchData as any)?._id || "",
          name: branchForm.name,
          address: branchForm.address,
          phone: branchForm.phone,
        };
        const updatedBranches = [...branches, created];
        setBranches(updatedBranches);
        localStorage.setItem("branches", JSON.stringify(updatedBranches));
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving branch:", error);
      alert("Failed to save branch. Please try again.");
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (window.confirm("Are you sure you want to delete this branch?")) {
      try {
        const { error } = await api.deleteBranch(branchId);

        if (error) {
          alert("Failed to delete branch: " + error);
          return;
        }

        // Update local state
        const updatedBranches = branches.filter((b) => b.id !== branchId);
        setBranches(updatedBranches);

        // Update localStorage backup
        localStorage.setItem("branches", JSON.stringify(updatedBranches));
      } catch (error) {
        console.error("Error deleting branch:", error);
        alert("Failed to delete branch. Please try again.");
      }
    }
  };

  return (
    <>
      <AppHeader title="Settings" />
      <div className="flex-1 p-6 space-y-6 max-w-3xl">

        {/* Company Logo */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-primary" /> Company Logo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Preview */}
              <div className="flex-shrink-0 w-28 h-28 rounded-xl border-2 border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden">
                {logo ? (
                  <img
                    src={logo}
                    alt="Company logo"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="w-8 h-8" />
                    <span className="text-xs">No logo</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="space-y-3 flex-1">
                <p className="text-sm text-muted-foreground">
                  Upload a PNG, JPG, SVG or WEBP file. Max 500 KB.
                  The logo will appear in the sidebar, branch selection screen and printed receipts.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoFile}
                  />
                  <Button
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    {logo ? "Replace Logo" : "Upload Logo"}
                  </Button>
                  {logo && (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { removeLogo(); setLogoError(""); }}
                    >
                      <X className="w-4 h-4 mr-2" /> Remove
                    </Button>
                  )}
                </div>
                {logoError && (
                  <p className="text-xs text-destructive">{logoError}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Details */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={companyDetails.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-address">Address</Label>
              <Input
                id="company-address"
                value={companyDetails.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter company address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone Number</Label>
              <Input
                id="company-phone"
                value={companyDetails.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-sm text-success">
                  <Check className="w-4 h-4" />
                  <span>Changes saved successfully</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Receipt Header & Footer */}
        <Card className="animate-fade-in" style={{ animationDelay: "50ms" }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" /> Printed Receipt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── Editor ───────────────────────────────────────── */}
              <div className="space-y-5">
                {/* Header lines */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Receipt Header
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="r-h1">Line 1 – Company name override</Label>
                    <Input
                      id="r-h1"
                      value={receipt.headerLine1}
                      onChange={(e) => handleReceiptChange("headerLine1", e.target.value)}
                      placeholder={companyDetails.name || "Leave blank to use company name"}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to auto-use the company name above.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r-h2">Line 2 – Tagline / service type</Label>
                    <Input
                      id="r-h2"
                      value={receipt.headerLine2}
                      onChange={(e) => handleReceiptChange("headerLine2", e.target.value)}
                      placeholder="e.g. Dry Cleaning & Laundry Services"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r-h3">Line 3 – Optional (website, email…)</Label>
                    <Input
                      id="r-h3"
                      value={receipt.headerLine3}
                      onChange={(e) => handleReceiptChange("headerLine3", e.target.value)}
                      placeholder="e.g. www.relclean.co.zw"
                    />
                  </div>
                </div>

                <Separator />

                {/* Footer lines */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Receipt Footer
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="r-f1">Line 1 – Thank-you message</Label>
                    <Input
                      id="r-f1"
                      value={receipt.footerLine1}
                      onChange={(e) => handleReceiptChange("footerLine1", e.target.value)}
                      placeholder="e.g. Thank you for your business!"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r-f2">Line 2 – Policy / notice</Label>
                    <Textarea
                      id="r-f2"
                      rows={2}
                      value={receipt.footerLine2}
                      onChange={(e) => handleReceiptChange("footerLine2", e.target.value)}
                      placeholder="e.g. Items not collected after 30 days will be donated."
                      className="resize-none text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r-f3">Line 3 – Optional extra</Label>
                    <Input
                      id="r-f3"
                      value={receipt.footerLine3}
                      onChange={(e) => handleReceiptChange("footerLine3", e.target.value)}
                      placeholder="e.g. Tel: +263 77 000 0000"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={handleSaveReceipt}
                    disabled={isReceiptSaving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isReceiptSaving ? "Saving…" : "Save Receipt Settings"}
                  </Button>
                  {receiptSaveSuccess && (
                    <div className="flex items-center gap-1.5 text-sm text-success">
                      <Check className="w-4 h-4" /> Saved
                    </div>
                  )}
                </div>
              </div>

              {/* ── Live preview ─────────────────────────────────── */}
              <div className="flex flex-col items-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 self-start">
                  Preview
                </p>
                <div
                  className="w-full max-w-[280px] bg-white text-black rounded border border-border shadow-sm"
                  style={{ fontFamily: "'Courier New', monospace", fontSize: "11px" }}
                >
                  {/* Receipt header preview */}
                  <div className="px-4 pt-4 pb-2 text-center space-y-0.5 border-b border-dashed border-gray-300">
                    <p className="font-bold text-sm">
                      {receipt.headerLine1.trim() || companyDetails.name || "Company Name"}
                    </p>
                    {(receipt.headerLine2.trim()) && (
                      <p>{receipt.headerLine2}</p>
                    )}
                    {(receipt.headerLine3.trim()) && (
                      <p>{receipt.headerLine3}</p>
                    )}
                    <p className="text-gray-500 text-[10px] pt-0.5">{companyDetails.address}</p>
                    <p className="text-gray-500 text-[10px]">{companyDetails.phone}</p>
                  </div>

                  {/* Stub order body */}
                  <div className="px-4 py-2 border-b border-dashed border-gray-300 space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Order #: RC-00001</span>
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1× Shirt (Pressing)</span>
                      <span>$2.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2× Trousers (Laundry)</span>
                      <span>$6.00</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-200">
                      <span>Total Pieces</span>
                      <span>3</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>TOTAL</span>
                      <span>$8.50</span>
                    </div>
                  </div>

                  {/* Receipt footer preview */}
                  <div className="px-4 py-3 text-center space-y-0.5 text-[10px]">
                    {receipt.footerLine1.trim() && (
                      <p className="font-semibold">{receipt.footerLine1}</p>
                    )}
                    {receipt.footerLine2.trim() && (
                      <p className="text-gray-500 leading-tight">{receipt.footerLine2}</p>
                    )}
                    {receipt.footerLine3.trim() && (
                      <p className="text-gray-500">{receipt.footerLine3}</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Branch Management */}
        <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" /> Branch Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {branches.map((branch) => (
              <div key={branch.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <div>
                    <span className="text-sm font-medium text-foreground">{branch.name}</span>
                    {branch.address && (
                      <div className="text-xs text-muted-foreground">{branch.address}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditBranch(branch)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBranch(branch.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={handleAddBranch}
            >
              + Add Branch
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Branch Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
            <DialogDescription>
              {editingBranch ? "Update branch details" : "Enter the details for the new branch"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name *</Label>
              <Input
                id="branch-name"
                value={branchForm.name}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Downtown Branch"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-address">Address (optional)</Label>
              <Input
                id="branch-address"
                value={branchForm.address || ""}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="e.g. 456 Downtown Street"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-phone">Phone (optional)</Label>
              <Input
                id="branch-phone"
                value={branchForm.phone || ""}
                onChange={(e) => setBranchForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g. +263 77 000 0000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBranch} className="bg-accent text-accent-foreground">
              {editingBranch ? "Update Branch" : "Add Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SettingsPage;
