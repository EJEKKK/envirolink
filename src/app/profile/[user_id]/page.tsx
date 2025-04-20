import * as React from "react";
import ProfileSection from "./_components/profile-section";
import { Loader2 } from "lucide-react";

interface ProfilePageProps {
  params: Promise<{ user_id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const userId = (await params).user_id;

  return (
    <main className="min-h-dvh">
      <React.Suspense
        fallback={
          <div className="absolute inset-0 right-1/2 left-1/2 translate-1/2">
            <Loader2 className="text-primary animate-spin" />
          </div>
        }
      >
        <ProfileSection userId={userId} />
      </React.Suspense>
    </main>
  );
}
