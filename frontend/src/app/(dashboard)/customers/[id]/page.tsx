"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { customersApi } from "@/lib/api";

type CustomerDetail = Awaited<ReturnType<typeof customersApi.get>>;

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customersApi
      .get(id)
      .then(setCustomer)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-8">Loading...</div>;
  if (!customer) return <div className="py-8">Customer not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/customers">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
        <h1 className="font-display text-2xl font-bold text-primary">{customer.name}</h1>
        <p className="text-muted-foreground">{customer.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p>{customer.phone || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Company</p>
            <p>{customer.company || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <p className="font-medium">${customer.total_purchases?.toLocaleString() ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Purchase</p>
            <p>
              {customer.last_purchase_date
                ? new Date(customer.last_purchase_date).toLocaleDateString()
                : "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.orders?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.order_id}</TableCell>
                    <TableCell>{o.product}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell>${(o.price * o.quantity).toLocaleString()}</TableCell>
                    <TableCell>
                      {new Date(o.purchase_date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No orders yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
