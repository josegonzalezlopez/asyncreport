import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Crea tu cuenta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Únete a tu equipo en AsyncReport
        </p>
      </div>
      <SignUp />
    </>
  );
}
