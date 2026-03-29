import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={{
          variables: { colorPrimary: "#E8602C" },
        }}
      />
    </div>
  );
}
