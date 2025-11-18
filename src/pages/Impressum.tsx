import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin } from "lucide-react";

export default function Impressum() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="p-6 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold mb-2">Impressum</h1>
          <p className="text-sm text-muted-foreground">
            Angaben gemäß § 5 TMG
          </p>
        </header>

        <Separator />

        <section aria-labelledby="anbieter">
          <h2 id="anbieter" className="text-2xl font-semibold mb-4">
            Anbieter
          </h2>
          <address className="not-italic text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">[Vollständiger Vereinsname]</p>
            <p>[Rechtsform, z.B. eingetragener Verein (e.V.)]</p>
            
            <div className="flex items-start gap-2 mt-4">
              <MapPin className="w-4 h-4 mt-1 flex-shrink-0" aria-hidden="true" />
              <div>
                <p>[Straße und Hausnummer]</p>
                <p>[PLZ und Ort]</p>
                <p>[Land]</p>
              </div>
            </div>
          </address>
        </section>

        <Separator />

        <section aria-labelledby="kontakt">
          <h2 id="kontakt" className="text-2xl font-semibold mb-4">
            Kontakt
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>E-Mail:</span>
              <a 
                href="mailto:[email]" 
                className="text-primary hover:underline"
                aria-label="E-Mail an [Vereinsname] senden"
              >
                [E-Mail-Adresse]
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>Telefon:</span>
              <a 
                href="tel:[phone]" 
                className="text-primary hover:underline"
                aria-label="Anrufen unter [Telefonnummer]"
              >
                [Telefonnummer]
              </a>
            </div>
          </div>
        </section>

        <Separator />

        <section aria-labelledby="vertreten">
          <h2 id="vertreten" className="text-2xl font-semibold mb-4">
            Vertreten durch
          </h2>
          <p className="text-muted-foreground">
            [Vorstand/Geschäftsführung]<br />
            [Name 1. Vorsitzende/r]<br />
            [Name 2. Vorsitzende/r]<br />
            [ggf. weitere Vorstände]
          </p>
        </section>

        <Separator />

        <section aria-labelledby="register">
          <h2 id="register" className="text-2xl font-semibold mb-4">
            Registereintrag
          </h2>
          <dl className="text-muted-foreground space-y-2">
            <div>
              <dt className="inline font-medium">Eintragung im Vereinsregister:</dt>
              <dd className="inline ml-2">[Registergericht, z.B. Amtsgericht ...]</dd>
            </div>
            <div>
              <dt className="inline font-medium">Registernummer:</dt>
              <dd className="inline ml-2">[VR ...]</dd>
            </div>
          </dl>
        </section>

        <Separator />

        <section aria-labelledby="verantwortlich">
          <h2 id="verantwortlich" className="text-2xl font-semibold mb-4">
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
          </h2>
          <address className="not-italic text-muted-foreground">
            [Name]<br />
            [Straße und Hausnummer]<br />
            [PLZ und Ort]
          </address>
        </section>

        <Separator />

        <section aria-labelledby="haftung">
          <h2 id="haftung" className="text-2xl font-semibold mb-4">
            Haftungsausschluss
          </h2>
          
          <h3 className="text-xl font-medium mb-3">Haftung für Inhalte</h3>
          <p className="text-muted-foreground mb-4">
            Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, 
            Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">Haftung für Links</h3>
          <p className="text-muted-foreground mb-4">
            Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen 
            Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">Urheberrecht</h3>
          <p className="text-muted-foreground">
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen 
            dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art 
            der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen 
            Zustimmung des jeweiligen Autors bzw. Erstellers.
          </p>
        </section>
      </Card>
    </div>
  );
}
