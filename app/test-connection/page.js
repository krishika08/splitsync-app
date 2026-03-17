"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestConnection() {
  const [status, setStatus] = useState("Checking connection…");

  useEffect(() => {
    async function checkConnection() {
      // A lightweight query — replace 'your_table' with any real table name,
      // or remove the .from() call to just confirm the client initialises.
      const { data, error } = await supabase
        .from("your_table") // 👈 change to an existing table, or remove this line
        .select("*")
        .limit(1);

      if (error) {
        setStatus(`❌ Error: ${error.message}`);
      } else {
        setStatus(`✅ Connected! Sample data: ${JSON.stringify(data)}`);
      }
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
