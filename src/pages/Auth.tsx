import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Navigation } from '@/components/Navigation';

const Auth = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, signInWithMicrosoft, user } = useAuth();
  const { toast } = useToast();
  
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, firstName, lastName);
        if (error) {
          toast({
            variant: "destructive",
            title: t('error'),
            description: error.message,
          });
        } else {
          toast({
            title: "Success",
            description: "Account created successfully! Please check your email to verify your account.",
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: "destructive",
            title: t('error'),
            description: error.message,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        variant: "destructive",
        title: t('error'),
        description: error.message,
      });
    }
  };

  const handleMicrosoftSignIn = async () => {
    const { error } = await signInWithMicrosoft();
    if (error) {
      toast({
        variant: "destructive",
        title: t('error'),
        description: error.message,
      });
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {isSignUp ? t('signup') : t('login')}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp 
              ? "Create your account to start finding rentals"
              : "Sign in to your account to continue"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Button variant="outline" onClick={handleGoogleSignIn} className="w-full">
              {t('signInWithGoogle')}
            </Button>
            <Button variant="outline" onClick={handleMicrosoftSignIn} className="w-full">
              {t('signInWithMicrosoft')}
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('firstName') || 'First name'}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('lastName') || 'Last name'}</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? t('signup') : t('login')}
            </Button>
          </form>

          <div className="text-center text-sm">
            {isSignUp ? (
              <>
                {t('alreadyHaveAccount')}{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => setIsSignUp(false)}>
                  {t('login')}
                </Button>
              </>
            ) : (
              <>
                {t('dontHaveAccount')}{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => setIsSignUp(true)}>
                  {t('signup')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Auth;