"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  addAdmin,
  removeAdmin,
  getAllAdmins,
} from "@/lib/actions/admin.actions";
import { formatDate } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

interface Admin {
  _id: string;
  email: string;
  createdAt: Date;
}

export default function AdminsClient({
  initialAdmins,
}: {
  initialAdmins: Admin[];
}) {
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const loadAdmins = useCallback(async () => {
    try {
      const data = await getAllAdmins();
      setAdmins(data.admins);
    } catch (error) {
      console.error("Error loading admins:", error);
      toast.error("Failed to load admins");
    }
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      await addAdmin(values.email);
      toast.success("Admin added successfully");
      form.reset();
      setIsAddOpen(false);
      loadAdmins();
    } catch (error) {
      console.error("Error adding admin:", error);
      const errMsg =
        error instanceof Error ? error.message : "Failed to add admin";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!confirm("Are you sure you want to remove this admin?")) return;

    try {
      await removeAdmin(adminId);
      toast.success("Admin removed successfully");
      loadAdmins();
    } catch (error) {
      console.error("Error removing admin:", error);
      const errMsg =
        error instanceof Error ? error.message : "Failed to remove admin";
      toast.error(errMsg);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Manage Administrators
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Authorized Accounts: <span className="font-bold text-slate-800 dark:text-slate-200">{admins.length}</span>
            </p>
          </div>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/10 rounded-xl w-full sm:w-auto text-xs font-semibold">
              <Plus className="mr-2 h-4 w-4" /> Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Add New Administrator
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin@example.com"
                          className="rounded-xl border-slate-200 dark:border-slate-800 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="submit"
                    className="w-full bg-sky-600 hover:bg-sky-700 rounded-xl text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...
                      </>
                    ) : (
                      "Add Administrator"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Admins Table */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800">
              <TableRow className="border-slate-100 dark:border-slate-800">
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  Administrator Email
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  Authorized Date
                </TableHead>
                <TableHead className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-400 py-10 text-sm">
                    No administrators registered
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow
                    key={admin._id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                  >
                    <TableCell className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2.5 whitespace-nowrap">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      {admin.email}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(admin.createdAt)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                        onClick={() => handleRemoveAdmin(admin._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
