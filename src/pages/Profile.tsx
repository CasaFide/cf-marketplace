import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const { profile, loading, error } = useProfile();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="mb-4">You must be logged in to view your profile.</p>
        <Button onClick={() => navigate('/auth')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading profile...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : profile ? (
              <div className="space-y-4">
                <div><strong>Name:</strong> {profile.full_name || 'N/A'}</div>
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>Phone:</strong> {profile.phone || 'N/A'}</div>
                <div><strong>Bio:</strong> {profile.bio || 'N/A'}</div>
                {/* Add more profile fields as needed */}
                <Button variant="outline" onClick={signOut}>Sign Out</Button>
              </div>
            ) : (
              <div>No profile found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ProfilePage;
