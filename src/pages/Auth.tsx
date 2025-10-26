import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { AlertCircle } from "lucide-react";

const emailSchema = z.string().trim().email({ message: "Invalid email address" }).max(254);
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" }).max(100);
const nameSchema = z.string().trim().min(1, { message: "Name is required" }).max(100);

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Sign in form
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  
  // Sign up form
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        
        if (profile?.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/student");
        }
      }
    };
    checkUser();
  }, [navigate]);

  const validateField = (name: string, value: string, schema: z.ZodString) => {
    try {
      schema.parse(value);
      setErrors(prev => ({ ...prev, [name]: "" }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [name]: error.errors[0].message }));
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailValid = validateField("signInEmail", signInEmail, emailSchema);
    const passwordValid = validateField("signInPassword", signInPassword, passwordSchema);
    
    if (!emailValid || !passwordValid) return;
    
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: signInEmail.trim().toLowerCase(),
      password: signInPassword,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message === "Invalid login credentials" 
          ? "Invalid email or password. Please check your credentials."
          : error.message,
      });
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      
      toast({
        title: "Success!",
        description: "You have successfully signed in.",
      });
      
      if (profile?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/student");
      }
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailValid = validateField("signUpEmail", signUpEmail, emailSchema);
    const passwordValid = validateField("signUpPassword", signUpPassword, passwordSchema);
    const nameValid = validateField("signUpName", signUpName, nameSchema);
    
    if (!emailValid || !passwordValid || !nameValid) return;
    
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: signUpEmail.trim().toLowerCase(),
      password: signUpPassword,
      options: {
        data: {
          full_name: signUpName.trim(),
          role: "student",
        },
        emailRedirectTo: `${window.location.origin}/student`,
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: error.message === "User already registered" 
          ? "An account with this email already exists. Please sign in instead."
          : error.message,
      });
      setLoading(false);
      return;
    }

    if (data.user) {
      toast({
        title: "Account created!",
        description: "Your account has been created successfully. You can now sign in.",
      });
      navigate("/student");
    }
    
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">BrotoRaise</CardTitle>
          <CardDescription>
            Student complaint management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="student@brototype.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    onBlur={() => validateField("signInEmail", signInEmail, emailSchema)}
                    disabled={loading}
                    required
                  />
                  {errors.signInEmail && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.signInEmail}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    onBlur={() => validateField("signInPassword", signInPassword, passwordSchema)}
                    disabled={loading}
                    required
                  />
                  {errors.signInPassword && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.signInPassword}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    onBlur={() => validateField("signUpName", signUpName, nameSchema)}
                    disabled={loading}
                    required
                  />
                  {errors.signUpName && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.signUpName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="student@brototype.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    onBlur={() => validateField("signUpEmail", signUpEmail, emailSchema)}
                    disabled={loading}
                    required
                  />
                  {errors.signUpEmail && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.signUpEmail}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    onBlur={() => validateField("signUpPassword", signUpPassword, passwordSchema)}
                    disabled={loading}
                    required
                  />
                  {errors.signUpPassword && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.signUpPassword}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}