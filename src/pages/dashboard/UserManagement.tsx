import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap: Record<string, string> = {};
    (rolesRes.data || []).forEach((r) => { roleMap[r.user_id] = r.role; });
    setUsers((profilesRes.data || []).map((p) => ({ ...p, role: roleMap[p.user_id] || "unknown" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role updated" });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
    }
  };

  const filtered = users.filter(u =>
    (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">User Management</h1><p className="text-muted-foreground">View and manage all platform users</p></div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.display_name || "Unknown"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{u.role}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => changeRole(u.user_id, v)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
