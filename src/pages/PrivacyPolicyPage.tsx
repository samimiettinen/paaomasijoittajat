import { Shield, Database, Lock, UserCheck, Mail, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function PrivacyPolicyPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Tietosuojaseloste</h1>
        <p className="text-muted-foreground">
          Vibe Coding Society ry - GDPR-tietosuojaseloste
        </p>
        <p className="text-xs text-muted-foreground">
          Päivitetty: {new Date().toLocaleDateString('fi-FI')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            1. Rekisterinpitäjä
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Nimi:</strong> Vibe Coding Society ry</p>
          <p><strong>Osoite:</strong> Helsinki, Suomi</p>
          <p><strong>Sähköposti:</strong> info@vibecoding.fi</p>
          <p>
            Rekisterinpitäjä vastaa henkilötietojen käsittelystä tämän tietosuojaselosteen 
            mukaisesti ja EU:n yleisen tietosuoja-asetuksen (GDPR) vaatimusten mukaisesti.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            2. Kerättävät henkilötiedot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Keräämme ja käsittelemme seuraavia henkilötietoja:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="font-medium">Perustiedot</p>
              <ul className="list-disc list-inside text-muted-foreground mt-1">
                <li>Etunimi ja sukunimi</li>
                <li>Sähköpostiosoite</li>
                <li>Puhelinnumero</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="font-medium">Ammatilliset tiedot</p>
              <ul className="list-disc list-inside text-muted-foreground mt-1">
                <li>Organisaatio</li>
                <li>Rooli/titteli</li>
                <li>LinkedIn-profiili</li>
                <li>GitHub-profiili</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="font-medium">Jäsenyystiedot</p>
              <ul className="list-disc list-inside text-muted-foreground mt-1">
                <li>Jäsenyyden tila</li>
                <li>Liittymispäivämäärä</li>
                <li>Admin-oikeudet</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="font-medium">Tapahtumatiedot</p>
              <ul className="list-disc list-inside text-muted-foreground mt-1">
                <li>Tapahtumakutsut</li>
                <li>RSVP-vastaukset</li>
                <li>Osallistumishistoria</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            3. Henkilötietojen käsittelyn tarkoitus ja oikeusperuste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Henkilötietoja käsitellään seuraaviin tarkoituksiin:</p>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span><strong>Jäsenrekisterin ylläpito:</strong> Yhdistyksen jäsenten hallinta ja yhteydenpito (oikeusperuste: sopimus)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span><strong>Tapahtumaviestintä:</strong> Kutsujen lähettäminen ja RSVP-vastausten hallinta (oikeusperuste: oikeutettu etu)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span><strong>Yhteisön rakentaminen:</strong> Jäsenten verkostoitumisen tukeminen (oikeusperuste: oikeutettu etu)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span><strong>Tilastointi:</strong> Yhdistyksen toiminnan seuranta ja kehittäminen (oikeusperuste: oikeutettu etu)</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            4. Tietoturva ja säilytys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Henkilötietojen suojaamiseksi on toteutettu seuraavat toimenpiteet:</p>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Tiedot tallennetaan salattuun tietokantaan (SSL/TLS-salaus)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Pääsy tietoihin on rajoitettu vain valtuutetuille ylläpitäjille</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Käyttäjien tunnistautuminen tapahtuu turvallisesti salasanalla</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Tiedot säilytetään EU:n alueella sijaitsevilla palvelimilla</span>
            </li>
          </ul>
          <Separator className="my-4" />
          <p>
            <strong>Säilytysaika:</strong> Henkilötietoja säilytetään jäsenyyden ajan ja 
            enintään 2 vuotta jäsenyyden päättymisen jälkeen, ellei lainsäädäntö edellytä 
            pidempää säilytysaikaa.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            5. Tietojen luovutus ja siirto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Henkilötietoja ei luovuteta kolmansille osapuolille markkinointitarkoituksiin. 
            Tietoja voidaan luovuttaa:
          </p>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Viranomaisille lain vaatiessa</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Palveluntarjoajille (sähköpostipalvelu), jotka käsittelevät tietoja puolestamme</span>
            </li>
          </ul>
          <p className="mt-4">
            <strong>Tietojen siirto EU:n ulkopuolelle:</strong> Käyttämämme palveluntarjoajat 
            saattavat siirtää tietoja EU:n ulkopuolelle. Tällöin varmistamme, että siirto 
            tapahtuu GDPR:n mukaisesti (esim. EU:n vakiosopimuslausekkeet).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-primary" />
            6. Rekisteröidyn oikeudet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>GDPR:n mukaisesti sinulla on seuraavat oikeudet:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Tarkastusoikeus</p>
              <p className="text-muted-foreground text-xs mt-1">
                Oikeus saada tietää, mitä tietoja sinusta on tallennettu
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Oikaisuoikeus</p>
              <p className="text-muted-foreground text-xs mt-1">
                Oikeus vaatia virheellisten tietojen korjaamista
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Poisto-oikeus</p>
              <p className="text-muted-foreground text-xs mt-1">
                Oikeus pyytää tietojesi poistamista ("oikeus tulla unohdetuksi")
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Siirto-oikeus</p>
              <p className="text-muted-foreground text-xs mt-1">
                Oikeus saada tietosi koneluettavassa muodossa
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Vastustamisoikeus</p>
              <p className="text-muted-foreground text-xs mt-1">
                Oikeus vastustaa tietojen käsittelyä tietyissä tilanteissa
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Valitusoikeus</p>
              <p className="text-muted-foreground text-xs mt-1">
                Oikeus tehdä valitus tietosuojavaltuutetulle
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <p>
            Voit käyttää oikeuksiasi ottamalla yhteyttä rekisterinpitäjään sähköpostitse 
            osoitteeseen <strong>info@vibecoding.fi</strong>. Vastaamme pyyntöihin 30 päivän kuluessa.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Evästeet</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Palvelumme käyttää välttämättömiä evästeitä kirjautumisen ja istunnon hallinnan 
            toteuttamiseen. Emme käytä seuranta- tai markkinointievästeitä.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>8. Muutokset tietosuojaselosteeseen</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Pidätämme oikeuden päivittää tätä tietosuojaselostetta. Olennaisista muutoksista 
            ilmoitetaan jäsenille sähköpostitse. Suosittelemme tarkistamaan tämän selosteen säännöllisesti.
          </p>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>Tietosuojavaltuutetun toimisto: tietosuoja.fi</p>
        <p className="mt-1">© {new Date().getFullYear()} Vibe Coding Society ry</p>
      </div>
    </div>
  );
}