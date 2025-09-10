import React from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  React.useEffect(() => {
    if (!session) return;
    // Redirection vers le dashboard perso après connexion
    navigate("/dashboards?tab=me", { replace: true });
  }, [session, navigate]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#F7F7F7] flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Se connecter</CardTitle>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={["google"]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#214A33",
                    brandAccent: "#F2994A",
                    inputBorder: "#BFBFBF",
                  },
                },
              },
            }}
            theme="light"
            redirectTo={window.location.origin}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;