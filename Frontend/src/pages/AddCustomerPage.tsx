import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

const AddCustomerPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      alert("Name and phone number are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
      };

      const { data, error } = await api.createCustomer(payload);

      if (error) {
        if (error.includes("already exists")) {
          alert(`A customer with phone number ${formData.phone} already exists`);
        } else {
          alert("Failed to create customer: " + error);
        }
        return;
      }

      if (!data) {
        alert("Failed to create customer: Unknown error");
        return;
      }

      alert("Customer created successfully!");
      navigate("/customers");
    } catch (error) {
      console.error("Error creating customer:", error);
      alert("Failed to create customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title="Add Customer" />
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6"
            onClick={() => navigate("/customers")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>

          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g. Sarah Moyo"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="e.g. +263 77 123 4567"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address (optional)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="e.g. sarah@email.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address (optional)</Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="e.g. 123 Main Street, Harare"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="flex gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/customers")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Customer"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default AddCustomerPage;
