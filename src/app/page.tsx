import Link from "next/link";
import { getCurrentUser } from "@/lib/currentUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Sparkles, 
  Bell, 
  Shield, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  Repeat,
  Brain,
  Smartphone
} from "lucide-react";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-wa-bg">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">WhatsTask</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild variant="ghost">
                <Link href="/app">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />

        <div className="container relative mx-auto px-4 py-24 sm:py-32 lg:py-40">
          <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-4 py-1.5">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              WhatsApp-Powered Task Management
            </Badge>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight max-w-5xl leading-tight">
              Never Miss a{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Task
              </span>{" "}
              Again
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl leading-relaxed">
              Smart reminders delivered straight to WhatsApp. Powered by AI to keep you organized and on track.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="text-lg h-14 px-8 shadow-lg hover:shadow-xl transition-all">
                <Link href={user ? "/app" : "/register"}>
                  {user ? "Go to Dashboard" : "Get Started Free"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg h-14 px-8">
                <Link href="#features">
                  Learn More
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">100% Free</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">AI-Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">WhatsApp Integration</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">No Credit Card</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-wa-bg py-24 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-foreground">
              Everything You Need to Stay Organized
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make task management effortless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">WhatsApp Notifications</CardTitle>
                <CardDescription>
                  Get instant reminders directly in WhatsApp. Never miss an important task again.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">AI-Powered Creation</CardTitle>
                <CardDescription>
                  Create multiple tasks with natural language. Let AI understand and organize your todos.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">Smart Reminders</CardTitle>
                <CardDescription>
                  Set one-time or recurring reminders. Daily, weekly, or custom schedules tailored to you.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Repeat className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">Recurring Tasks</CardTitle>
                <CardDescription>
                  Automatically repeat tasks daily or weekly. Set it once and forget it.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">Secure & Private</CardTitle>
                <CardDescription>
                  Your data is encrypted and secure. We respect your privacy and never share your information.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">Lightning Fast</CardTitle>
                <CardDescription>
                  Optimized for speed. Add, edit, and manage tasks in seconds with our intuitive interface.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-24 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              How It Works
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-foreground">
              Get Started in 3 Simple Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">Create Account</h3>
              <p className="text-muted-foreground">
                Sign up in seconds with just your email. No credit card required.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">Connect WhatsApp</h3>
              <p className="text-muted-foreground">
                Scan QR code to connect your WhatsApp. Your messages stay private.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">Start Managing</h3>
              <p className="text-muted-foreground">
                Create tasks and get reminders. Use AI to plan your entire week.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-wa-bg py-24 lg:py-32">
        <div className="container mx-auto px-4">
          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-white to-primary/5 max-w-4xl mx-auto">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <CardContent className="relative p-12 sm:p-16 lg:p-20">
              <div className="max-w-2xl mx-auto text-center space-y-6">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground">
                  Ready to Get Organized?
                </h2>
                <p className="text-xl text-muted-foreground">
                  Join users who never miss important tasks. Get started in under a minute.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button asChild size="lg" className="text-lg h-14 px-8">
                    <Link href={user ? "/app" : "/register"}>
                      {user ? "Go to Dashboard" : "Create Free Account"}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">© 2025 WhatsTask. All rights reserved.</p>
            <p className="mt-2 text-sm">
              Smart task management powered by WhatsApp and AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
