import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useGmailFilters() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["gmail-filters", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gmail_config")
        .select("domains, keywords")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      return {
        domains: (data?.domains || []) as string[],
        keywords: (data?.keywords || []) as string[],
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
