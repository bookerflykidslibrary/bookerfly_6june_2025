// Similar to Login.jsx but use `supabase.auth.signUp()` instead
const handleSignup = async () => {
  if (isEmailLogin) {
    await supabase.auth.signUp({
      email,
      password
    });
  } else {
    await supabase.auth.signUp({
      phone,
      password
    });
  }
};
