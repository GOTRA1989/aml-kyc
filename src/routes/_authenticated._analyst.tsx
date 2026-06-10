import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_analyst")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (error || data?.role !== "analyst") {
      throw redirect({
        to: "/login",
        search: { message: "Unauthorized Access. Please login as an AML Analyst" },
      });
    }

    return { role: data.role };
  },
  component: () => <Outlet />,
});
