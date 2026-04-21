import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Bienvenido de nuevo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inicia sesión para continuar con tu equipo
        </p>
      </div>
      <SignIn />
    </>
  );
}
