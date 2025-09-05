import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDebugSession } from "@/api/debug";

const Debug = () => {
  const [info, setInfo] = React.useState<{ id: string; email: string | null } | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const me = await getDebugSession();
      setInfo(me);
    };
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Debug — Session</CardTitle>
        </CardHeader>
        <CardContent>
          {info ? (
            <div className="space-y-2 text-sm text-[#214A33]">
              <div><span className="font-medium">User ID:</span> {info.id}</div>
              <div><span className="font-medium">Email:</span> {info.email ?? "—"}</div>
            </div>
          ) : (
            <div className="text-sm text-[#214A33]/70">Chargement…</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Debug;