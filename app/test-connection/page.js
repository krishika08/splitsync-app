"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestConnection() {
  const [status, setStatus] = useState("Checking connection…");

  useEffect(() => {
    async function checkConnection() {
      // Client init + auth endpoint reachability (no table dependency).
      const { data, error } = await supabase.auth.getSession();
      if (error) setStatus(`❌ Error: ${error.message}`);
      else setStatus(`✅ Connected! Session: ${data?.session ? "present" : "none"}`);
    }

    checkConnection();
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>Supabase Connection Test</h1>
      <p>{status}</p>
    </main>
  );
}
