const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://livgfvhvgzywmccjhkvc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpdmdmdmh2Z3p5d21jY2poa3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzEwOTIsImV4cCI6MjA5Nzg0NzA5Mn0.wfMzZxO7s1tHgt5n1P-2JcruDRF4Z6ZGQjzS_vcYRLI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  console.log("Starting user creation...");

  // Sign in to get the user ID
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'sahil@eodtracker.local',
    password: 'Password123!',
  });

  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }
  console.log("User logged in!");

  const userId = authData.user.id;

  // 2. Ensure designation exists
  let designationId = null;
  const { data: existingDesigs, error: dSearchErr } = await supabase
    .from('designations')
    .select('id')
    .eq('name', 'Support Lead')
    .maybeSingle();
  
  if (dSearchErr) console.error("Error searching designation:", dSearchErr);

  if (existingDesigs) {
    designationId = existingDesigs.id;
  } else {
    const { data: newDesig, error: dInsertErr } = await supabase
      .from('designations')
      .insert([{ name: 'Support Lead' }])
      .select('id')
      .single();
    
    if (dInsertErr) console.error("Error inserting designation:", dInsertErr);
    else designationId = newDesig.id;
  }

  // 3. Update Profile with extra fields
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      phone: '7400127317',
      work_location: 'Future Generali',
      designation_id: designationId
    })
    .eq('id', userId);

  if (profileError) {
    console.error("Profile Update Error:", profileError);
  } else {
    console.log("Profile updated successfully!");
  }
  
  console.log("\\n--- Admin User Updated ---");
  console.log("Employee ID: I099");
  console.log("Temporary Password: Password123!");
  console.log("Name: Sahil D'Souza");
  console.log("--------------------------\\n");
}

createAdmin();
