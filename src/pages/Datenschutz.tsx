import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Datenschutz() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="p-6 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold mb-2">Datenschutzerklärung</h1>
          <p className="text-sm text-muted-foreground">
            Stand: {new Date().toLocaleDateString("de-DE")}
          </p>
        </header>

        <Separator />

        <section aria-labelledby="verantwortlicher">
          <h2 id="verantwortlicher" className="text-2xl font-semibold mb-4">
            1. Verantwortlicher
          </h2>
          <p className="text-muted-foreground mb-4">
            Verantwortlich für die Datenverarbeitung auf dieser Website ist:
          </p>
          <address className="not-italic text-muted-foreground">
            <strong>[Vereinsname]</strong>
            <br />
            [Straße und Hausnummer]
            <br />
            [PLZ und Ort]
            <br />
            E-Mail: <a href="mailto:[email]" className="text-primary hover:underline">[E-Mail-Adresse]</a>
            <br />
            Telefon: [Telefonnummer]
          </address>
        </section>

        <Separator />

        <section aria-labelledby="erhebung">
          <h2 id="erhebung" className="text-2xl font-semibold mb-4">
            2. Erhebung und Speicherung personenbezogener Daten
          </h2>
          
          <h3 className="text-xl font-medium mb-3 mt-4">2.1 Beim Besuch der Website</h3>
          <p className="text-muted-foreground mb-4">
            Beim Aufrufen unserer Website werden durch den auf Ihrem Endgerät zum Einsatz kommenden 
            Browser automatisch Informationen an den Server unserer Website gesendet. Diese Informationen 
            werden temporär in einem sogenannten Logfile gespeichert.
          </p>
          <p className="text-muted-foreground mb-4">
            Folgende Informationen werden dabei ohne Ihr Zutun erfasst und bis zur automatisierten 
            Löschung gespeichert:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
            <li>IP-Adresse des anfragenden Rechners</li>
            <li>Datum und Uhrzeit des Zugriffs</li>
            <li>Name und URL der abgerufenen Datei</li>
            <li>Website, von der aus der Zugriff erfolgt (Referrer-URL)</li>
            <li>Verwendeter Browser und ggf. das Betriebssystem Ihres Rechners</li>
          </ul>
          <p className="text-muted-foreground mb-4">
            Die Rechtsgrundlage für die Datenverarbeitung ist Art. 6 Abs. 1 lit. f DSGVO. 
            Unser berechtigtes Interesse folgt aus den aufgelisteten Zwecken zur Datenerhebung.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-6">2.2 Bei Registrierung und Nutzung</h3>
          <p className="text-muted-foreground mb-4">
            Bei der Registrierung für die Nutzung unserer personalisierten Leistungen werden einige 
            personenbezogene Daten erhoben, wie Name, E-Mail-Adresse und weitere profilbezogene Daten.
          </p>
          <p className="text-muted-foreground mb-4">
            Die Datenverarbeitung zum Zwecke der Registrierung erfolgt auf Grundlage Ihrer Einwilligung 
            (Art. 6 Abs. 1 lit. a DSGVO). Sie können eine von Ihnen erteilte Einwilligung jederzeit 
            widerrufen.
          </p>
        </section>

        <Separator />

        <section aria-labelledby="cookies">
          <h2 id="cookies" className="text-2xl font-semibold mb-4">
            3. Cookies
          </h2>
          <p className="text-muted-foreground mb-4">
            Wir setzen auf unserer Website Cookies ein. Hierbei handelt es sich um kleine Dateien, 
            die Ihr Browser automatisch erstellt und die auf Ihrem Endgerät gespeichert werden, 
            wenn Sie unsere Seite besuchen.
          </p>
          <p className="text-muted-foreground mb-4">
            Cookies richten auf Ihrem Endgerät keinen Schaden an, enthalten keine Viren, Trojaner 
            oder sonstige Schadsoftware. In dem Cookie werden Informationen abgelegt, die sich jeweils 
            im Zusammenhang mit dem spezifisch eingesetzten Endgerät ergeben.
          </p>
          
          <h3 className="text-xl font-medium mb-3 mt-4">3.1 Notwendige Cookies</h3>
          <p className="text-muted-foreground mb-4">
            Diese Cookies sind für die Funktionalität der Website erforderlich und können nicht 
            deaktiviert werden. Sie werden in der Regel nur als Reaktion auf von Ihnen getätigte 
            Aktionen gesetzt.
          </p>

          <h3 className="text-xl font-medium mb-3 mt-4">3.2 Cookie-Verwaltung</h3>
          <p className="text-muted-foreground mb-4">
            Sie können Ihre Cookie-Einstellungen jederzeit über die Cookie-Einstellungen am unteren 
            Rand der Seite anpassen.
          </p>
        </section>

        <Separator />

        <section aria-labelledby="rechte">
          <h2 id="rechte" className="text-2xl font-semibold mb-4">
            4. Ihre Rechte
          </h2>
          <p className="text-muted-foreground mb-4">
            Sie haben das Recht:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>gemäß Art. 15 DSGVO Auskunft über Ihre von uns verarbeiteten Daten zu verlangen</li>
            <li>gemäß Art. 16 DSGVO die Berichtigung Ihrer Daten zu verlangen</li>
            <li>gemäß Art. 17 DSGVO die Löschung Ihrer Daten zu verlangen</li>
            <li>gemäß Art. 18 DSGVO die Einschränkung der Verarbeitung zu verlangen</li>
            <li>gemäß Art. 20 DSGVO Ihre Daten in einem strukturierten Format zu erhalten</li>
            <li>gemäß Art. 21 DSGVO der Verarbeitung zu widersprechen</li>
            <li>gemäß Art. 77 DSGVO sich bei einer Aufsichtsbehörde zu beschweren</li>
          </ul>
        </section>

        <Separator />

        <section aria-labelledby="aenderungen">
          <h2 id="aenderungen" className="text-2xl font-semibold mb-4">
            5. Änderungen der Datenschutzerklärung
          </h2>
          <p className="text-muted-foreground">
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den 
            aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen 
            in der Datenschutzerklärung umzusetzen.
          </p>
        </section>
      </Card>
    </div>
  );
}
