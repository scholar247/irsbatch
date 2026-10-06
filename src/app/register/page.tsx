import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { RegistrationWizard } from "@/components/register/wizard";

export const metadata = { title: "Become a Member — IRS Batch 2007 Community" };

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1 py-16">
        <Container>
          <div className="mb-10 text-center">
            <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Start your community journey
            </h1>
            <p className="mt-3 text-foreground-muted">A few short steps — your application is reviewed by our team.</p>
          </div>
          <RegistrationWizard />
        </Container>
      </main>
      <Footer />
    </div>
  );
}
