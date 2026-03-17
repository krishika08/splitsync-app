import supabase from "@/lib/supabaseClient";

export default async function Home() {
  const { data, error } = await supabase.from("test").select("*");

  console.log(data, error);

  return <div>Supabase Connected 🚀</div>;
}