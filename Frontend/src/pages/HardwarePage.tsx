import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Printer,
  MonitorCheck,
  Barcode,
  Wallet,
  HardDrive,
  PlusCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Wifi,
  Usb,
  Bluetooth,
  Cable,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type HardwareType =
  | "Printer"
  | "Cash Drawer"
  | "Barcode Scanner"
  | "Customer Display"
  | "Other";

type ConnectionType = "USB" | "Network" | "Bluetooth" | "Serial";
type HardwareStatus = "connected" | "disconnected" | "error";

interface HardwareDevice {
  _id: string;
  name: string;
  type: HardwareType;
  connection: ConnectionType;
  address?: string;
  port?: number;
  branch?: string;
  status: HardwareStatus;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEVICE_TYPES: HardwareType[] = [
  "Printer",
  "Cash Drawer",
  "Barcode Scanner",
  "Customer Display",
  "Other",
];

const CONNECTION_TYPES: ConnectionType[] = [
  "USB",
  "Network",
  "Bluetooth",
  "Serial",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const typeIcon = (type: HardwareType, cls = "w-5 h-5") => {
  switch (type) {
    case "Printer":          return <Printer className={cls} />;
    case "Cash Drawer":      return <Wallet className={cls} />;
    case "Barcode Scanner":  return <Barcode className={cls} />;
    case "Customer Display": return <MonitorCheck className={cls} />;
    default:                 return <HardDrive className={cls} />;
  }
};

const connectionIcon = (c: ConnectionType) => {
  switch (c) {
    case "Network":   return <Wifi className="w-3.5 h-3.5" />;
    case "USB":       return <Usb className="w-3.5 h-3.5" />;
    case "Bluetooth": return <Bluetooth className="w-3.5 h-3.5" />;
    case "Serial":    return <Cable className="w-3.5 h-3.5" />;
  }
};

const statusBadge = (status: HardwareStatus) => {
  switch (status) {
    case "connected":
      return (
        <Badge variant="outline" className="border-success text-success gap-1">
          <CheckCircle2 className="w-3 h-3" /> Connected
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="border-destructive text-destructive gap-1">
          <AlertCircle className="w-3 h-3" /> Error
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-muted-foreground text-muted-foreground gap-1">
          <XCircle className="w-3 h-3" /> Disconnected
        </Badge>
      );
  }
};

const blankForm = () => ({
  name: "",
  type: "Printer" as HardwareType,
  connection: "USB" as ConnectionType,
  address: "",
  port: "",
  branch: "",
  notes: "",
  status: "disconnected" as HardwareStatus,
  isActive: true,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

const HardwarePage = () => {
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<HardwareDevice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(blankForm());

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<HardwareDevice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchDevices = async () => {
    setIsLoading(true);
    const { data, error } = await api.getHardware();
    if (!error && data?.hardware && Array.isArray(data.hardware)) {
      setDevices(data.hardware as HardwareDevice[]);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchDevices(); }, []);

  // ── Grouped view ──────────────────────────────────────────────────────────
  const grouped = DEVICE_TYPES.reduce<Record<string, HardwareDevice[]>>((acc, t) => {
    acc[t] = devices.filter((d) => d.type === t);
    return acc;
  }, {});

  const activeGroups = DEVICE_TYPES.filter((t) => grouped[t].length > 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingDevice(null);
    setForm(blankForm());
    setDialogOpen(true);
  };

  const openEdit = (device: HardwareDevice) => {
    setEditingDevice(device);
    setForm({
      name:       device.name,
      type:       device.type,
      connection: device.connection,
      address:    device.address || "",
      port:       device.port?.toString() || "",
      branch:     device.branch || "",
      notes:      device.notes || "",
      status:     device.status,
      isActive:   device.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Device name is required.");
    setIsSaving(true);
    try {
      const payload = {
        name:       form.name.trim(),
        type:       form.type,
        connection: form.connection,
        address:    form.address.trim() || undefined,
        port:       form.port ? Number(form.port) : undefined,
        branch:     form.branch.trim() || undefined,
        notes:      form.notes.trim() || undefined,
        status:     form.status,
        isActive:   form.isActive,
      };

      if (editingDevice) {
        const { data, error } = await api.updateHardware(editingDevice._id, payload);
        if (error) return alert("Failed to update device: " + error);
        setDevices((prev) =>
          prev.map((d) => (d._id === editingDevice._id ? (data as HardwareDevice) : d))
        );
      } else {
        const { data, error } = await api.createHardware(payload);
        if (error) return alert("Failed to add device: " + error);
        setDevices((prev) => [data as HardwareDevice, ...prev]);
      }
      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await api.deleteHardware(deleteTarget._id);
      if (error) return alert("Failed to delete device: " + error);
      setDevices((prev) => prev.filter((d) => d._id !== deleteTarget._id));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (device: HardwareDevice) => {
    const newStatus: HardwareStatus =
      device.status === "connected" ? "disconnected" : "connected";
    const { data, error } = await api.updateHardware(device._id, { status: newStatus });
    if (!error && data) {
      setDevices((prev) =>
        prev.map((d) => (d._id === device._id ? { ...d, status: newStatus } : d))
      );
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <AppHeader title="Hardware" />
      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading devices…"
              : devices.length === 0
              ? "No devices registered yet."
              : `${devices.length} device${devices.length !== 1 ? "s" : ""} registered`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchDevices} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={openAdd}
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> Add Device
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {!isLoading && devices.length === 0 && (
          <Card className="animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <HardDrive className="w-12 h-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-foreground">No hardware devices yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add printers, cash drawers, barcode scanners and more.
                </p>
              </div>
              <Button onClick={openAdd}>
                <PlusCircle className="w-4 h-4 mr-1.5" /> Add First Device
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Grouped device cards */}
        {activeGroups.map((type) => (
          <Card key={type} className="animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span className="text-primary">{typeIcon(type)}</span>
                {type}
                <Badge variant="secondary" className="ml-1">{grouped[type].length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {grouped[type].map((device) => (
                  <div
                    key={device._id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Left */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        {typeIcon(device.type, "w-4 h-4")}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {device.name}
                          {!device.isActive && (
                            <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            {connectionIcon(device.connection)} {device.connection}
                          </span>
                          {device.address && (
                            <span className="font-mono">
                              {device.address}{device.port ? `:${device.port}` : ""}
                            </span>
                          )}
                          {device.branch && <span>{device.branch}</span>}
                          {device.notes && (
                            <span className="italic truncate max-w-xs">{device.notes}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {statusBadge(device.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleStatus(device)}>
                            {device.status === "connected" ? (
                              <><XCircle className="w-4 h-4 mr-2 text-muted-foreground" /> Set Disconnected</>
                            ) : (
                              <><CheckCircle2 className="w-4 h-4 mr-2 text-success" /> Set Connected</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEdit(device)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(device)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDevice ? "Edit Device" : "Add Hardware Device"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Device Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Counter 1 Printer"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((p) => ({ ...p, type: v as HardwareType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Connection <span className="text-destructive">*</span></Label>
                <Select
                  value={form.connection}
                  onValueChange={(v) => setForm((p) => ({ ...p, connection: v as ConnectionType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONNECTION_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {form.connection === "Network" ? "IP Address"
                    : form.connection === "USB" ? "USB Path / Port"
                    : form.connection === "Serial" ? "COM Port"
                    : "Device Address"}
                </Label>
                <Input
                  placeholder={
                    form.connection === "Network" ? "192.168.1.100"
                    : form.connection === "USB" ? "USB001"
                    : form.connection === "Serial" ? "COM3"
                    : "—"
                  }
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>

              {form.connection === "Network" && (
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    placeholder="9100"
                    min={1}
                    max={65535}
                    value={form.port}
                    onChange={(e) => setForm((p) => ({ ...p, port: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input
                  placeholder="e.g. Harare CBD"
                  value={form.branch}
                  onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v as HardwareStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="disconnected">Disconnected</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes about this device"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : editingDevice ? "Save Changes" : "Add Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this device from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default HardwarePage;
